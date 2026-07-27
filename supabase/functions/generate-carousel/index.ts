// Edge Function `generate-carousel` (§7). A chave da Anthropic vive SÓ aqui.
// Parse defensivo: strip de cercas → JSON.parse → validação zod → 1 retentativa.
import { corsHeaders, fail, json } from '../_shared/cors.ts'
import { userClient } from '../_shared/client.ts'
import { GENERATE_MODEL, GENERATE_SYSTEM_PROMPT, CAPTION_FORMULA } from '../_shared/prompt.ts'
import { generatedCarouselSchema, stripCodeFences } from '../_shared/vendor/schema.ts'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const PILLARS = ['artigo_semana', 'erro_certame', 'decisao_comentada', 'pergunta_licitante', 'bastidores']

interface GenInput {
  topic: string
  pillar: string
  count: number
  angle?: string | null
}

async function callModel(userText: string): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada no servidor (Supabase → Edge Functions → Secrets).')
  }
  console.log(`generate-carousel: chamando ${GENERATE_MODEL}`)
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // claude-sonnet-5 usa extended thinking: o orçamento precisa cobrir o
      // raciocínio + o JSON de saída, senão para em max_tokens sem bloco de texto.
      model: GENERATE_MODEL,
      max_tokens: 8000,
      system: GENERATE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userText }],
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    const msg = `Falha na API da Anthropic (${res.status}): ${detail.slice(0, 300)}`
    console.error(msg)
    throw new Error(msg)
  }
  const data = await res.json()
  // Procura o bloco de texto em qualquer posição (pode haver blocos não-texto antes).
  const blocks = Array.isArray(data?.content) ? data.content : []
  const textBlock = blocks.find((b: { type?: string; text?: unknown }) => b?.type === 'text' && typeof b?.text === 'string')
  const text = textBlock?.text ?? (typeof blocks?.[0]?.text === 'string' ? blocks[0].text : undefined)
  if (typeof text !== 'string') {
    const dump = JSON.stringify(data).slice(0, 400)
    console.error('Resposta inesperada da Anthropic:', dump)
    throw new Error(`Resposta da IA sem bloco de texto. stop_reason=${data?.stop_reason ?? '?'} · ${dump}`)
  }
  return text
}

function buildUserText(input: GenInput): string {
  const angle = input.angle ? `\nÂngulo: ${input.angle}.` : ''
  return (
    `Tema: ${input.topic}.\n` +
    `Pilar: ${input.pillar}.\n` +
    `Gere exatamente ${input.count} slides.${angle}\n\n` +
    `${CAPTION_FORMULA}`
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('Método não suportado.', 405)

  let input: GenInput
  try {
    const b = await req.json()
    input = {
      topic: String(b.topic ?? '').trim(),
      pillar: String(b.pillar ?? ''),
      count: Number(b.count ?? 7),
      angle: b.angle ?? null,
    }
  } catch {
    return fail('Corpo inválido.')
  }
  if (!input.topic) return fail('Informe um tema.')
  if (!PILLARS.includes(input.pillar)) return fail('Pilar inválido.')
  if (input.count < 5 || input.count > 7) return fail('Número de slides deve ser de 5 a 7.')

  // ── Chamada + parse defensivo com uma única retentativa (§7) ────────────────
  let userText = buildUserText(input)
  let lastErr = ''
  let parsed: ReturnType<typeof generatedCarouselSchema.parse> | null = null

  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    let raw: string
    try {
      raw = await callModel(attempt === 0 ? userText : `${userText}\n\nERRO DE VALIDAÇÃO ANTERIOR: ${lastErr}\nCorrija e responda apenas o JSON.`)
    } catch (e) {
      console.error('generate-carousel erro:', (e as Error).message)
      return fail((e as Error).message, 502)
    }
    const result = generatedCarouselSchema.safeParse(safeJson(stripCodeFences(raw)))
    if (result.success) {
      parsed = result.data
    } else {
      lastErr = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    }
  }

  if (!parsed) return fail(`A IA não devolveu um carrossel válido: ${lastErr}`, 422)

  // ── Persistência (RLS: owner_id = auth.uid() por default) ───────────────────
  const supabase = userClient(req)
  const { data: post, error: postErr } = await supabase
    .from('posts')
    .insert({ title: parsed.title, pillar: input.pillar, caption: parsed.caption, hashtags: parsed.hashtags, status: 'draft' })
    .select()
    .single()
  if (postErr || !post) return fail(`Falha ao salvar o post: ${postErr?.message}`, 500)

  const slideRows = parsed.slides.map((s, i) => ({
    post_id: post.id,
    position: i,
    template: s.template,
    eyebrow: s.eyebrow,
    title: s.title,
    body: s.body,
    citation: s.citation,
    alt_text: s.alt_text,
  }))
  const { error: slidesErr } = await supabase.from('slides').insert(slideRows)
  if (slidesErr) return fail(`Falha ao salvar os slides: ${slidesErr.message}`, 500)

  return json({ post_id: post.id, carousel: parsed })
})

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
