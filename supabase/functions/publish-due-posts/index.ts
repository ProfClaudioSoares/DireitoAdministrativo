// Edge Function `publish-due-posts` (§10). Disparada pelo pg_cron a cada 5 min.
// Publica carrosséis vencidos, um por vez, com ≤3 tentativas e backoff exponencial.
//
// ⚠ IDEMPOTÊNCIA (a falha mais cara): os container ids são persistidos ANTES de
//   cada avanço. Se `media_publish` falhar, a retentativa retoma do MESMO parent —
//   nunca recria o fluxo do zero (o que publicaria duplicado). Ver §10.
import { adminClient } from '../_shared/client.ts'
import { json } from '../_shared/cors.ts'

const GRAPH = 'https://graph.facebook.com/v20.0'
const MAX_SLIDES = 10 // ⚠ trava em código (§10). Publicamos 5–7; o teto não incomoda.
const MAX_ATTEMPTS = 3
const DAILY_LIMIT = 100 // publicações/conta em janela móvel de 24h (§10)

type Supa = ReturnType<typeof adminClient>

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function metaPost(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const token = Deno.env.get('META_LONG_LIVED_TOKEN')!
  const body = new URLSearchParams({ ...params, access_token: token })
  const res = await fetch(`${GRAPH}/${path}`, { method: 'POST', body })
  const data = await res.json()
  if (!res.ok) {
    const msg = (data?.error?.message as string) ?? 'erro desconhecido'
    throw new Error(msg)
  }
  return data
}

async function metaGet(path: string): Promise<Record<string, unknown>> {
  const token = Deno.env.get('META_LONG_LIVED_TOKEN')!
  const res = await fetch(`${GRAPH}/${path}?access_token=${token}`)
  const data = await res.json()
  if (!res.ok) throw new Error((data?.error?.message as string) ?? 'erro')
  return data
}

async function logStep(supabase: Supa, postId: string, attempt: number, step: string, ok: boolean, payload: unknown) {
  await supabase.from('publish_attempts').insert({ post_id: postId, attempt_no: attempt, step, ok, payload })
}

// Verifica a cota da Meta e o limite local antes de publicar (§10).
async function withinLimits(supabase: Supa, igUser: string): Promise<boolean> {
  try {
    const usage = await metaGet(`${igUser}/content_publishing_limit?fields=quota_usage,config`)
    const quota = Number((usage?.data as { quota_usage?: number }[])?.[0]?.quota_usage ?? 0)
    if (quota >= DAILY_LIMIT) return false
  } catch {
    // se a consulta falhar, cai no controle local
  }
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', since)
  return (count ?? 0) < DAILY_LIMIT
}

async function publishPost(supabase: Supa, post: Record<string, unknown>, igUser: string): Promise<void> {
  const postId = post.id as string
  const { data: slides } = await supabase.from('slides').select('*').eq('post_id', postId).order('position')
  if (!slides || slides.length === 0) throw new Error('Post sem slides.')
  if (slides.length > MAX_SLIDES) throw new Error(`Carrossel excede o teto de ${MAX_SLIDES} slides.`)

  let childIds: string[] = (post.ig_child_container_ids as string[] | null) ?? []
  let parentId = (post.ig_parent_container_id as string | null) ?? null

  // Card único (1 slide) publica como IMAGEM; 2+ slides como CAROUSEL.
  const isSingle = slides.length === 1

  // Passo 1 — mídias. No card único, a legenda já vai na própria mídia.
  for (let i = childIds.length; i < slides.length; i++) {
    const s = slides[i]
    const { data: signed } = await supabase.storage.from('renders').createSignedUrl(s.rendered_url as string, 24 * 3600)
    if (!signed?.signedUrl) throw new Error(`Slide ${i} sem URL assinada (render ausente?).`)
    const params: Record<string, string> = isSingle
      ? { image_url: signed.signedUrl, caption: String(post.caption ?? ''), ...(s.alt_text ? { alt_text: String(s.alt_text) } : {}) }
      : { image_url: signed.signedUrl, is_carousel_item: 'true', ...(s.alt_text ? { alt_text: String(s.alt_text) } : {}) }
    const child = await metaPost(`${igUser}/media`, params)
    childIds = [...childIds, String(child.id)]
    // ⚠ persiste imediatamente (idempotência)
    await supabase.from('posts').update({ ig_child_container_ids: childIds }).eq('id', postId)
    await logStep(supabase, postId, 1, 'child', true, { i, id: child.id })
  }

  // Passo 2 — container pai CAROUSEL (só quando há 2+ slides). Só cria se não existe.
  if (!isSingle && !parentId) {
    const parent = await metaPost(`${igUser}/media`, {
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption: String(post.caption ?? ''),
    })
    parentId = String(parent.id)
    await supabase.from('posts').update({ ig_parent_container_id: parentId }).eq('id', postId)
    await logStep(supabase, postId, 1, 'parent', true, { id: parentId })
  }

  // Passo 3 — publicar. Card único usa o próprio container da imagem; carrossel, o pai.
  const creationId = isSingle ? childIds[0] : parentId
  const published = await metaPost(`${igUser}/media_publish`, { creation_id: creationId as string })
  const mediaId = String(published.id)
  await supabase
    .from('posts')
    .update({ ig_media_id: mediaId, status: 'published', published_at: new Date().toISOString(), error_message: null })
    .eq('id', postId)
  await logStep(supabase, postId, 1, 'publish', true, { id: mediaId })

  // Passo 4 — hashtags como primeiro comentário.
  const hashtags = (post.hashtags as string[] | null) ?? []
  if (hashtags.length > 0) {
    try {
      await metaPost(`${mediaId}/comments`, { message: hashtags.join(' ') })
      await logStep(supabase, postId, 1, 'comment', true, {})
    } catch (e) {
      await logStep(supabase, postId, 1, 'comment', false, { error: (e as Error).message })
    }
  }
}

Deno.serve(async () => {
  const supabase = adminClient()
  const igUser = Deno.env.get('IG_USER_ID')!

  const { data: due, error } = await supabase.rpc('claim_due_posts', { p_limit: 5 })
  if (error) return json({ error: error.message }, 500)
  if (!due || due.length === 0) return json({ processed: 0 })

  let processed = 0
  for (const post of due) {
    if (!(await withinLimits(supabase, igUser))) {
      // Deixa agendado; próximo ciclo tenta de novo quando a cota abrir.
      continue
    }

    let ok = false
    let lastError = ''
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !ok; attempt++) {
      try {
        // recarrega o post (pode ter ganho container ids em tentativa anterior)
        const { data: fresh } = await supabase.from('posts').select('*').eq('id', post.id).single()
        await publishPost(supabase, fresh ?? post, igUser)
        ok = true
      } catch (e) {
        lastError = (e as Error).message
        await logStep(supabase, post.id, attempt, 'publish', false, { error: lastError })
        if (attempt < MAX_ATTEMPTS) await sleep(2 ** attempt * 1000) // 2s, 4s
      }
    }

    if (ok) {
      processed++
    } else {
      // Falha definitiva → status failed com mensagem legível em português (§10).
      await supabase
        .from('posts')
        .update({ status: 'failed', error_message: `Falha ao publicar após ${MAX_ATTEMPTS} tentativas: ${lastError}` })
        .eq('id', post.id)
    }
  }

  return json({ processed })
})
