// ─────────────────────────────────────────────────────────────────────────────
// MEDIÇÃO DE TEXTO — fonte única de verdade (§4, §4-A, §8, §9)
//
// ⚠ CÓDIGO ÚNICO. Importado tanto pelo canvas do editor (contador ao vivo,
//   trava dos 53 px) quanto pela Edge Function `render-slides`. Qualquer
//   duplicação vira divergência entre preview e PNG.
//
// ⚠ A trava dos 53 px NUNCA usa medição do DOM. Usa as métricas reais do `.ttf`
//   via opentype.js — as MESMAS que o `satori` usa ao gerar o PNG.
// ─────────────────────────────────────────────────────────────────────────────

import type { Font } from 'opentype.js'
import { TYPE } from '@/brand/tokens'

// Chave lógica de fonte → arquivo. Bate com FONT.files em tokens.ts.
export type FontKey = 'playfair500' | 'playfairItalic500' | 'jost300' | 'jost500'

const ALL_FONT_KEYS: FontKey[] = ['playfair500', 'playfairItalic500', 'jost300', 'jost500']

// Registro global de fontes já parseadas. Preenchido uma vez por ambiente:
//   - navegador: src/lib/fonts.ts (fetch dos .ttf estáticos)
//   - Edge Function: supabase/functions/_shared/fonts.ts (bucket `brand`)
const registry = new Map<FontKey, Font>()

export function registerFont(key: FontKey, font: Font): void {
  registry.set(key, font)
}

export function isFontRegistered(key: FontKey): boolean {
  return registry.has(key)
}

export function areFontsReady(): boolean {
  return ALL_FONT_KEYS.every((k) => registry.has(k))
}

function requireFont(key: FontKey): Font {
  const f = registry.get(key)
  if (!f) {
    throw new Error(
      `Fonte "${key}" não registrada. Chame registerFont antes de medir. ` +
        `(navegador: src/lib/fonts.ts · edge: functions/_shared/fonts.ts)`,
    )
  }
  return f
}

/** Largura de avanço, em px, de UMA linha (sem quebra), na fonte/tamanho dados. */
export function measureLineWidth(text: string, key: FontKey, fontSize: number): number {
  if (!text) return 0
  return requireFont(key).getAdvanceWidth(text, fontSize)
}

/**
 * Quebra `text` por LARGURA — do mesmo modo que o satori quebra dentro de um
 * contêiner de largura fixa (§4-A regra 1). Quebra em espaços; se uma única
 * palavra estourar a caixa, ela é mantida na própria linha (o satori faz o mesmo).
 */
export function wrapByWidth(
  text: string,
  key: FontKey,
  fontSize: number,
  maxWidth: number,
): string[] {
  const paragraphs = text.split('\n')
  const lines: string[] = []
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (measureLineWidth(candidate, key, fontSize) <= maxWidth || !current) {
        current = candidate
      } else {
        lines.push(current)
        current = word
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

// Restrições de corpo (§7 regra 4): máx. 24 caracteres/linha, 5 linhas.
export const BODY_MAX_CHARS_PER_LINE = 24
export const BODY_MAX_LINES = 5

export interface FitResult {
  ok: boolean
  lines: string[]
  lineCount: number
  overflow: boolean
  reason?: 'linhas' | 'largura' | 'caracteres'
  /** Mensagem canônica de estouro exibida no editor. */
  message?: string
}

const SPLIT_MESSAGE = 'Este slide virou dois. Divida.'

/**
 * Verifica se um CORPO cabe na caixa, na MESMA medição do renderizador (§4).
 * `fontSize` nunca deve descer abaixo de TYPE.bodyMin (53 px); o canvas
 * impede a redução, então aqui apenas medimos no tamanho corrente.
 */
export function checkBodyFit(text: string, fontSize: number, boxWidth: number): FitResult {
  const size = Math.max(fontSize, TYPE.bodyMin)
  const lines = wrapByWidth(text, 'jost300', size, boxWidth)

  // Regra dura de caracteres/linha (§7): mesmo cabendo em largura, 24 é o teto.
  const tooManyChars = lines.some((l) => l.length > BODY_MAX_CHARS_PER_LINE)
  const tooManyLines = lines.length > BODY_MAX_LINES

  if (tooManyLines) {
    return { ok: false, lines, lineCount: lines.length, overflow: true, reason: 'linhas', message: SPLIT_MESSAGE }
  }
  if (tooManyChars) {
    return { ok: false, lines, lineCount: lines.length, overflow: true, reason: 'caracteres', message: SPLIT_MESSAGE }
  }
  return { ok: true, lines, lineCount: lines.length, overflow: false }
}

/**
 * Trava genérica por altura de caixa para títulos/subtítulos: mede quantas linhas
 * o texto ocupa e se ultrapassa `maxLines`.
 */
export function checkFit(
  text: string,
  key: FontKey,
  fontSize: number,
  boxWidth: number,
  maxLines: number,
): FitResult {
  const lines = wrapByWidth(text, key, fontSize, boxWidth)
  const overflow = lines.length > maxLines
  return {
    ok: !overflow,
    lines,
    lineCount: lines.length,
    overflow,
    reason: overflow ? 'linhas' : undefined,
    message: overflow ? SPLIT_MESSAGE : undefined,
  }
}
