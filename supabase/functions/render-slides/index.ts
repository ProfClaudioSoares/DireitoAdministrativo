// Edge Function `render-slides` (§9). Renderiza UM slide por invocação (teto de
// memória/wall-clock da Edge Function). O cliente orquestra com barra de progresso.
//   SVG (satori, componentes de src/templates) → PNG 1080×1350 (@resvg/resvg-wasm).
import React from 'react'
import satori from 'satori'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import { corsHeaders, fail, json } from '../_shared/cors.ts'
import { userClient } from '../_shared/client.ts'
import { SlideRenderer } from '../_shared/vendor/templates.tsx'
import { SLIDE_H, SLIDE_W } from '../_shared/vendor/geometry.ts'
import type { BrandAssets } from '../_shared/vendor/types.ts'

// ── Estado quente entre invocações (mesmo isolate) ──────────────────────────
let wasmReady = false
const fontCache = new Map<string, ArrayBuffer>()
const assetCache = new Map<string, string>()

async function ensureWasm(): Promise<void> {
  if (wasmReady) return
  const wasm = await fetch('https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm')
  await initWasm(wasm)
  wasmReady = true
}

async function loadFont(supabase: ReturnType<typeof userClient>, file: string): Promise<ArrayBuffer> {
  if (fontCache.has(file)) return fontCache.get(file)!
  const { data, error } = await supabase.storage.from('brand').download(file)
  if (error || !data) throw new Error(`Fonte ${file} indisponível no bucket brand: ${error?.message}`)
  const buf = await data.arrayBuffer()
  fontCache.set(file, buf)
  return buf
}

async function loadAssetDataUri(supabase: ReturnType<typeof userClient>, file: string): Promise<string> {
  if (assetCache.has(file)) return assetCache.get(file)!
  const { data, error } = await supabase.storage.from('brand').download(file)
  if (error || !data) throw new Error(`Asset ${file} indisponível no bucket brand: ${error?.message}`)
  const bytes = new Uint8Array(await data.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const uri = `data:image/png;base64,${btoa(binary)}`
  assetCache.set(file, uri)
  return uri
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('Método não suportado.', 405)

  let postId: string
  let position: number | null
  try {
    const b = await req.json()
    postId = String(b.post_id ?? '')
    position = b.position === undefined ? null : Number(b.position)
  } catch {
    return fail('Corpo inválido.')
  }
  if (!postId) return fail('Informe post_id.')

  const supabase = userClient(req)

  const query = supabase.from('slides').select('*').eq('post_id', postId).order('position')
  const { data: slides } = await query
  if (!slides || slides.length === 0) return fail('Post sem slides.', 404)
  const total = slides.length
  const slide = position === null ? slides[0] : slides.find((s) => s.position === position)
  if (!slide) return fail('Slide não encontrado.', 404)

  try {
    await ensureWasm()

    const [playfair, playfairItalic, jost300, jost500, monogramAmber, monogramDark, wordmark] = await Promise.all([
      loadFont(supabase, 'PlayfairDisplay-Medium.ttf'),
      loadFont(supabase, 'PlayfairDisplay-MediumItalic.ttf'),
      loadFont(supabase, 'Jost-Light.ttf'),
      loadFont(supabase, 'Jost-Medium.ttf'),
      loadAssetDataUri(supabase, 'monogram-amber.png'),
      loadAssetDataUri(supabase, 'monogram-dark.png'),
      loadAssetDataUri(supabase, 'wordmark.png'),
    ])

    const assets: BrandAssets = { monogramAmber, monogramDark, wordmark }

    const element = React.createElement(SlideRenderer, {
      template: slide.template,
      index: slide.position,
      total,
      assets,
      content: { eyebrow: slide.eyebrow, title: slide.title, body: slide.body, citation: slide.citation },
    })

    const svg = await satori(element as React.ReactElement, {
      width: SLIDE_W,
      height: SLIDE_H,
      fonts: [
        { name: 'Playfair Display', data: playfair, weight: 500, style: 'normal' },
        { name: 'Playfair Display', data: playfairItalic, weight: 500, style: 'italic' },
        { name: 'Jost', data: jost300, weight: 300, style: 'normal' },
        { name: 'Jost', data: jost500, weight: 500, style: 'normal' },
      ],
    })

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: SLIDE_W } })
    const rendered = resvg.render()
    const width = rendered.width
    const height = rendered.height
    // ⚠ Todas as imagens do carrossel são cortadas para a proporção do 1º item (§9).
    // Aborta se divergir de 4:5.
    if (Math.abs(width / height - SLIDE_W / SLIDE_H) > 0.001) {
      return fail(`Proporção inválida (${width}×${height}); esperado 4:5.`, 500)
    }
    const png = rendered.asPng()

    const path = `${postId}/${slide.position}.png`
    const { error: upErr } = await supabase.storage.from('renders').upload(path, png, { contentType: 'image/png', upsert: true })
    if (upErr) throw new Error(`Falha no upload: ${upErr.message}`)

    // Guarda o path; a URL assinada de 24h é gerada só na publicação (§9).
    await supabase.from('slides').update({ rendered_url: path }).eq('id', slide.id)

    // Sinaliza ao cliente qual a próxima posição a renderizar (ou fim).
    const next = slides.find((s) => s.position > slide.position)?.position ?? null
    return json({ position: slide.position, path, next })
  } catch (e) {
    return fail((e as Error).message, 500)
  }
})
