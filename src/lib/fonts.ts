// Carregamento de fontes NO NAVEGADOR (§9). Faz o fetch das instâncias estáticas
// `.ttf` e registra em lib/measure. A Edge Function tem seu próprio carregador
// (functions/_shared/fonts.ts) que lê do bucket `brand` — a função de MEDIÇÃO,
// porém, é a mesma (lib/measure).
//
// Sirva os .ttf a partir de /public/fonts/ (copie de src/brand/fonts/) ou de uma
// URL assinada do bucket. Nunca CDN de fonte variável.

import opentype from 'opentype.js'
import { registerFont, areFontsReady, type FontKey } from './measure'
import { FONT } from '@/brand/tokens'

const SOURCES: Record<FontKey, string> = {
  playfair500: `/fonts/${FONT.files.playfair500}`,
  playfairItalic500: `/fonts/${FONT.files.playfairItalic500}`,
  jost300: `/fonts/${FONT.files.jost300}`,
  jost500: `/fonts/${FONT.files.jost500}`,
}

let loading: Promise<void> | null = null

export function loadBrandFonts(): Promise<void> {
  if (areFontsReady()) return Promise.resolve()
  if (loading) return loading
  loading = (async () => {
    await Promise.all(
      (Object.keys(SOURCES) as FontKey[]).map(async (key) => {
        const res = await fetch(SOURCES[key])
        if (!res.ok) throw new Error(`Falha ao carregar fonte ${key} (${SOURCES[key]}): ${res.status}`)
        const buf = await res.arrayBuffer()
        registerFont(key, opentype.parse(buf))
      }),
    )
  })()
  return loading
}
