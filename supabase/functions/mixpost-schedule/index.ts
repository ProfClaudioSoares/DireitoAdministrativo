// Edge Function `mixpost-schedule` — envia um post APROVADO ao Mixpost, já
// agendado para publicar no Instagram. O Mixpost é o agendador/publicador
// (dispensa o App Review/PPA da Meta). O token do Mixpost vive só no servidor.
//
// Fluxo (idempotente — retentativa nunca duplica):
//   1. pré-checagens do portão (citações verificadas, sem block, tudo renderizado)
//   2. sobe cada PNG do bucket `renders` para a mídia do Mixpost (reaproveita ids)
//   3. cria o post no Mixpost agendado em scheduled_at (reaproveita o uuid)
//   4. marca nosso post como 'scheduled' (o trigger de banco revalida o portão)
//
// Refs da API: docs.mixpost.app/api/posts/create, /api/media, /api/accounts.
import { corsHeaders, fail, json } from '../_shared/cors.ts'
import { userClient } from '../_shared/client.ts'

interface Env {
  base: string
  core: string
  workspace: string
  token: string
  accountId: number
}

function readEnv(): Env | null {
  const base = Deno.env.get('MIXPOST_BASE_URL')
  const workspace = Deno.env.get('MIXPOST_WORKSPACE_UUID')
  const token = Deno.env.get('MIXPOST_TOKEN')
  const accountId = Number(Deno.env.get('MIXPOST_ACCOUNT_ID'))
  if (!base || !workspace || !token || !accountId) return null
  return {
    base: base.replace(/\/$/, ''),
    core: (Deno.env.get('MIXPOST_CORE_PATH') || 'mixpost').replace(/^\/|\/$/g, ''),
    workspace,
    token,
    accountId,
  }
}

function api(env: Env, path: string): string {
  return `${env.base}/${env.core}/api/${env.workspace}/${path}`
}

function authHeaders(env: Env): HeadersInit {
  return { Authorization: `Bearer ${env.token}`, Accept: 'application/json' }
}

// Lê um id de mídia de formatos de resposta variados do Mixpost.
function readId(d: Record<string, unknown>): string | null {
  const cand = (d?.id ?? (d?.data as Record<string, unknown>)?.id ?? (d?.media as Record<string, unknown>)?.id) as unknown
  return cand == null ? null : String(cand)
}
function readUuid(d: Record<string, unknown>): string | null {
  const cand = (d?.uuid ?? (d?.data as Record<string, unknown>)?.uuid ?? d?.id) as unknown
  return cand == null ? null : String(cand)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('Método não suportado.', 405)

  const env = readEnv()
  if (!env) return fail('Mixpost não configurado (MIXPOST_BASE_URL/WORKSPACE_UUID/TOKEN/ACCOUNT_ID).', 500)

  let postId: string
  let scheduledAt: string
  try {
    const b = await req.json()
    postId = String(b.post_id ?? '')
    scheduledAt = String(b.scheduled_at ?? '')
  } catch {
    return fail('Corpo inválido.')
  }
  if (!postId || !scheduledAt) return fail('Informe post_id e scheduled_at.')

  const supabase = userClient(req)
  const { data: post } = await supabase.from('posts').select('*').eq('id', postId).single()
  if (!post) return fail('Post não encontrado.', 404)
  if (post.status !== 'approved' && post.status !== 'scheduled') {
    return fail('Só posts aprovados podem ser agendados.', 409)
  }

  const { data: slides } = await supabase.from('slides').select('*').eq('post_id', postId).order('position')
  if (!slides || slides.length === 0) return fail('Post sem slides.', 400)

  // ── 1. Pré-checagens do portão (antes de tocar o Mixpost, para não orfanar) ──
  const { data: unverified } = await supabase.from('citations').select('id').eq('post_id', postId).eq('verified', false)
  if ((unverified ?? []).length > 0) return fail('Há citação(ões) não verificada(s).', 409)
  const { data: blocks } = await supabase
    .from('compliance_flags')
    .select('id')
    .eq('post_id', postId)
    .eq('severity', 'block')
    .eq('resolved', false)
  if ((blocks ?? []).length > 0) return fail('Há alerta(s) bloqueante(s) em aberto.', 409)
  if (slides.some((s) => !s.rendered_url)) return fail('Há slide(s) sem imagem renderizada.', 409)

  try {
    // ── 2. Sobe as mídias (reaproveita as já enviadas) ────────────────────────
    let mediaIds: string[] = (post.mixpost_media_ids as string[] | null) ?? []
    for (let i = mediaIds.length; i < slides.length; i++) {
      const path = slides[i].rendered_url as string
      const { data: file, error: dlErr } = await supabase.storage.from('renders').download(path)
      if (dlErr || !file) throw new Error(`Falha ao ler o render do slide ${i}: ${dlErr?.message}`)

      const form = new FormData()
      form.append('file', file, `${postId}-${i}.png`)
      const res = await fetch(api(env, 'media'), { method: 'POST', headers: authHeaders(env), body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(`Mixpost media (${res.status}): ${JSON.stringify(data).slice(0, 200)}`)
      const id = readId(data)
      if (!id) throw new Error('Mixpost media não retornou id.')
      mediaIds = [...mediaIds, id]
      await supabase.from('posts').update({ mixpost_media_ids: mediaIds }).eq('id', postId)
    }

    // ── 3. Cria o post agendado no Mixpost (reaproveita o uuid) ────────────────
    let postUuid = (post.mixpost_post_uuid as string | null) ?? null
    if (!postUuid) {
      const when = new Date(scheduledAt)
      const date = when.toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
      const time = when.toISOString().slice(11, 16) // HH:mm (UTC)
      const body = {
        date,
        time,
        timezone: 'UTC',
        schedule: true,
        accounts: [env.accountId],
        versions: [
          {
            account_id: 0,
            is_original: true,
            content: [{ body: String(post.caption ?? ''), media: mediaIds.map((m) => Number(m) || m) }],
          },
        ],
      }
      const res = await fetch(api(env, 'posts'), {
        method: 'POST',
        headers: { ...authHeaders(env), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(`Mixpost posts (${res.status}): ${JSON.stringify(data).slice(0, 300)}`)
      postUuid = readUuid(data)
      if (!postUuid) throw new Error('Mixpost não retornou uuid do post.')
      await supabase.from('posts').update({ mixpost_post_uuid: postUuid }).eq('id', postId)
    }

    // ── 4. Marca como agendado (o trigger de banco revalida o portão) ─────────
    const { error: stErr } = await supabase
      .from('posts')
      .update({ status: 'scheduled', scheduled_at: scheduledAt, error_message: null })
      .eq('id', postId)
    if (stErr) throw new Error(stErr.message)

    return json({ status: 'scheduled', mixpost_post_uuid: postUuid })
  } catch (e) {
    return fail((e as Error).message, 502)
  }
})
