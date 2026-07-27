// Edge Function `compliance-review` (§8). Roda o portão em duas camadas:
//   Camada 1 (determinística) — runRegexLayer, cria citations + flags.
//   Camada 2 (IA) — parecer, nunca veredito: cria flags layer='ia', jamais
//   remove flag da camada 1 nem aprova sozinha.
import { corsHeaders, fail, json } from '../_shared/cors.ts'
import { userClient } from '../_shared/client.ts'
import { runRegexLayer } from '../_shared/compliance.ts'
import { GENERATE_MODEL } from '../_shared/prompt.ts'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

const REVIEW_SYSTEM = `Você é revisor de conformidade da publicidade da advocacia brasileira sob o
Código de Ética e Disciplina da OAB e o Provimento CFOAB nº 205/2021 (Anexo
Único). Avalie o texto de um carrossel de Instagram e sua legenda. Aponte apenas
riscos reais. Não invente. Você produz PARECER, não veredito: seus apontamentos
viram alertas para o titular decidir.
Responda APENAS JSON: {"flags":[{"severity":"block"|"warn","excerpt":string,"rationale":string}]}`

interface IaFlag {
  severity: 'block' | 'warn'
  excerpt: string
  rationale: string
}

async function iaLayer(fullText: string): Promise<IaFlag[]> {
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GENERATE_MODEL,
        max_tokens: 1500,
        system: REVIEW_SYSTEM,
        messages: [{ role: 'user', content: fullText }],
      }),
    })
    if (!res.ok) return []
    const data = await res.json()
    const text = String(data?.content?.[0]?.text ?? '')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
    const parsed = JSON.parse(text)
    const flags = Array.isArray(parsed?.flags) ? parsed.flags : []
    return flags
      .filter((f: unknown): f is IaFlag => {
        const x = f as IaFlag
        return (x?.severity === 'block' || x?.severity === 'warn') && typeof x?.excerpt === 'string' && typeof x?.rationale === 'string'
      })
      .slice(0, 20)
  } catch {
    // Parecer indisponível não deve derrubar o portão determinístico.
    return []
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('Método não suportado.', 405)

  let postId: string
  try {
    postId = String((await req.json()).post_id ?? '')
  } catch {
    return fail('Corpo inválido.')
  }
  if (!postId) return fail('Informe post_id.')

  const supabase = userClient(req)
  const { data: post } = await supabase.from('posts').select('*').eq('id', postId).single()
  if (!post) return fail('Post não encontrado.', 404)
  const { data: slides } = await supabase.from('slides').select('*').eq('post_id', postId).order('position')

  const fullText = [
    post.caption ?? '',
    ...(slides ?? []).flatMap((s) => [s.eyebrow, s.title, s.body, s.citation].filter(Boolean) as string[]),
  ].join('\n')

  // ── Camada 1 ────────────────────────────────────────────────────────────────
  const regex = runRegexLayer(fullText)

  // Reconciliação de citações: preserva verificação por raw_text (§5 text_hash).
  const { data: existingCitations } = await supabase.from('citations').select('*').eq('post_id', postId)
  const existingByRaw = new Map((existingCitations ?? []).map((c) => [c.raw_text.toLowerCase(), c]))
  const newRawSet = new Set(regex.citations.map((c) => c.raw_text.toLowerCase()))

  for (const cand of regex.citations) {
    if (!existingByRaw.has(cand.raw_text.toLowerCase())) {
      await supabase.from('citations').insert({
        post_id: postId,
        raw_text: cand.raw_text,
        kind: cand.kind,
        text_hash: await md5(cand.raw_text),
        verified: false,
      })
    }
  }
  // Remove citações que sumiram do texto.
  for (const c of existingCitations ?? []) {
    if (!newRawSet.has(c.raw_text.toLowerCase())) await supabase.from('citations').delete().eq('id', c.id)
  }

  // Reconciliação de flags: anti-ruído — mantém resolvidas as âncoras já resolvidas.
  const { data: existingFlags } = await supabase.from('compliance_flags').select('*').eq('post_id', postId)
  const resolvedAnchors = new Map(
    (existingFlags ?? []).filter((f) => f.resolved).map((f) => [`${f.rule}::${f.excerpt.toLowerCase()}`, f.resolution_note]),
  )
  // Apaga flags não resolvidas para reescrever; resolvidas são recriadas se ainda casarem.
  await supabase.from('compliance_flags').delete().eq('post_id', postId).eq('resolved', false)

  const ia = await iaLayer(fullText)
  const allFindings = [
    ...regex.flags,
    ...ia.map((f) => ({ rule: 'parecer_ia', layer: 'ia' as const, severity: f.severity, excerpt: f.excerpt, rationale: f.rationale })),
  ]

  for (const f of allFindings) {
    const anchor = `${f.rule}::${f.excerpt.toLowerCase()}`
    const alreadyResolved = resolvedAnchors.has(anchor)
    if (alreadyResolved) continue // já existe resolvida no banco; não reabrir (anti-ruído)
    await supabase.from('compliance_flags').insert({
      post_id: postId,
      rule: f.rule,
      layer: f.layer,
      severity: f.severity,
      excerpt: f.excerpt,
      rationale: f.rationale,
      resolved: false,
    })
  }

  // ── Status resultante: blocked se houver block aberto; senão review. ─────────
  const { data: openBlocks } = await supabase
    .from('compliance_flags')
    .select('id')
    .eq('post_id', postId)
    .eq('severity', 'block')
    .eq('resolved', false)
  const nextStatus = (openBlocks ?? []).length > 0 ? 'blocked' : 'review'
  await supabase.from('posts').update({ status: nextStatus }).eq('id', postId)

  return json({ status: nextStatus })
})

// md5 em Deno via SubtleCrypto não existe (não é FIPS); usa uma lib padrão.
async function md5(text: string): Promise<string> {
  const { crypto } = await import('https://deno.land/std@0.224.0/crypto/mod.ts')
  const buf = await crypto.subtle.digest('MD5', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
