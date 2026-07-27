import { describe, it, expect } from 'vitest'
import type { CSSProperties, ReactElement } from 'react'
import { SlideRenderer, TEMPLATE_META } from '../index'
import type { TemplateProps } from '../types'
import { color } from '@/brand/tokens'
import type { TemplateId } from '@/lib/types'

// Data URI mínimo (1×1 transparente) — os testes inspecionam ESTILO, não pixels.
const PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const assets = { monogramAmber: PX, monogramDark: PX, wordmark: PX }

function props(template: TemplateId): TemplateProps & { template: TemplateId } {
  return {
    template,
    index: 1,
    total: 5,
    assets,
    content: {
      eyebrow: 'RÓTULO',
      title: 'Título de teste',
      body: 'Corpo curto de teste',
      citation: 'art. 164 da Lei 14.133/2021',
    },
  }
}

// Resolve a árvore de componentes-função (puros, sem hooks) até nós DOM,
// coletando todos os objetos de estilo. É um mini-render suficiente para
// travar as propriedades de cor/geometria dos templates.
function collectStyles(node: unknown): CSSProperties[] {
  const out: CSSProperties[] = []
  const walk = (n: unknown): void => {
    if (n == null || typeof n === 'boolean' || typeof n === 'string' || typeof n === 'number') return
    if (Array.isArray(n)) return n.forEach(walk)
    const el = n as ReactElement
    if (!el.type) return
    if (typeof el.type === 'function') {
      const rendered = (el.type as (p: unknown) => unknown)(el.props)
      walk(rendered)
      return
    }
    // nó DOM (string): coleta estilo e recorre nos filhos
    const style = (el.props as { style?: CSSProperties } | undefined)?.style
    if (style) out.push(style)
    const children = (el.props as { children?: unknown } | undefined)?.children
    walk(children)
  }
  walk(node)
  return out
}

const AMBER_TOKENS: string[] = [color.amber, color.amberHi, color.amberDeep, color.amberBurnt]
const ALL: TemplateId[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9']

describe('§4 — regra do âmbar via amberFor', () => {
  it('nenhum template com fundo paper usa âmbar puro #FD8902', () => {
    for (const id of ALL) {
      const bgIsPaper = TEMPLATE_META[id].background === color.paper
      if (!bgIsPaper) continue
      const styles = collectStyles(SlideRenderer(props(id)))
      const values = styles.flatMap((s) => [s.color, s.backgroundColor])
      expect(values, `${id} não pode conter #FD8902 sobre papel`).not.toContain(color.amber)
    }
  })

  it('templates com fundo ink não usam a variante queimada amber-burnt', () => {
    for (const id of ALL) {
      const bgIsInk = TEMPLATE_META[id].background === color.ink
      if (!bgIsInk) continue
      const styles = collectStyles(SlideRenderer(props(id)))
      const values = styles.flatMap((s) => [s.color, s.backgroundColor])
      expect(values, `${id} sobre ink deve usar âmbar puro, não amber-burnt`).not.toContain(color.amberBurnt)
    }
  })
})

describe('§4 — garantia de construção: âmbar nunca preenche área grande (≤8%)', () => {
  // Prova estrutural: todo elemento com backgroundColor âmbar é fino — um fio ou
  // uma canelura. min(width,height) numérico ≤ 10px. Sem isso, âmbar de fundo passaria.
  it('todo backgroundColor âmbar pertence a um elemento fino', () => {
    for (const id of ALL) {
      // Templates cujo FUNDO é âmbar por design (ex.: T6) são exceção deliberada.
      if (AMBER_TOKENS.includes(TEMPLATE_META[id].background as string)) continue
      const styles = collectStyles(SlideRenderer(props(id)))
      for (const s of styles) {
        if (s.backgroundColor && AMBER_TOKENS.includes(s.backgroundColor as string)) {
          const w = typeof s.width === 'number' ? s.width : Infinity
          const h = typeof s.height === 'number' ? s.height : Infinity
          expect(
            Math.min(w, h),
            `${id}: âmbar de fundo só em fio/canelura (min(w,h) ≤ 10), achei w=${String(s.width)} h=${String(s.height)}`,
          ).toBeLessThanOrEqual(10)
        }
      }
    }
  })
})
