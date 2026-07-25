// Carregamento de fontes NO NAVEGADOR (§9), a partir do bucket `brand` do
// Supabase — não de /public/fonts. Assim as instâncias estáticas .ttf não
// precisam ser versionadas no repositório, e um deploy (ex.: Vercel) fica fiel
// sem commitar binários da marca.
//
// As MESMAS bytes servem aos dois consumidores do navegador:
//   1. lib/measure (opentype.js) — medição idêntica à do renderizador satori;
//   2. layout visual do preview — injetadas via CSS Font Loading API (FontFace).
// A Edge Function render-slides lê os mesmos arquivos do mesmo bucket.

import opentype from 'opentype.js'
import { registerFont, areFontsReady, type FontKey } from './measure'
import { FONT } from '@/brand/tokens'
import { supabase } from './supabase'

// Chave lógica → (arquivo no bucket, família/peso/estilo do FontFace).
const SPEC: Record<FontKey, { file: string; family: string; weight: number; style: 'normal' | 'italic' }> = {
  playfair500: { file: FONT.files.playfair500, family: FONT.displayFamily, weight: 500, style: 'normal' },
  playfairItalic500: { file: FONT.files.playfairItalic500, family: FONT.displayFamily, weight: 500, style: 'italic' },
  jost300: { file: FONT.files.jost300, family: FONT.utilFamily, weight: 300, style: 'normal' },
  jost500: { file: FONT.files.jost500, family: FONT.utilFamily, weight: 500, style: 'normal' },
}

let loading: Promise<void> | null = null
let facesInjected = false

async function downloadFont(file: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage.from('brand').download(file)
  if (error || !data) throw new Error(`Fonte ${file} indisponível no bucket brand: ${error?.message ?? 'sem dados'}`)
  return await data.arrayBuffer()
}

export function loadBrandFonts(): Promise<void> {
  if (areFontsReady() && facesInjected) return Promise.resolve()
  if (loading) return loading
  loading = (async () => {
    await Promise.all(
      (Object.keys(SPEC) as FontKey[]).map(async (key) => {
        const { file, family, weight, style } = SPEC[key]
        const buf = await downloadFont(file)

        // 1) medição (opentype.js) — métricas reais do .ttf
        registerFont(key, opentype.parse(buf))

        // 2) layout visual — injeta o FontFace com as MESMAS bytes
        if (typeof document !== 'undefined' && 'fonts' in document) {
          const face = new FontFace(family, buf, { weight: String(weight), style })
          await face.load()
          document.fonts.add(face)
        }
      }),
    )
    facesInjected = true
  })()
  return loading
}
