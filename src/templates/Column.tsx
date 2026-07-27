// ─────────────────────────────────────────────────────────────────────────────
// COLUNA DÓRICA — elemento de assinatura (§4, corrigido na v1.1)
//
// ⚠ A v1 usava `repeating-linear-gradient`, que o satori NÃO implementa. Aqui as
//   caneluras são quatro elementos explícitos, e o progresso é revelado por um
//   wrapper com `overflow: hidden` (clip-path e mask NÃO funcionam no satori).
// ─────────────────────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react'
import { amberFor, type Background } from '@/brand/tokens.ts'
import { COLUMN } from './geometry.ts'

const W = COLUMN.width

// Quatro caneluras verticais: width 0.09*W, left em 0/25/50/75% de W, altura 100%.
function Flutes({ amber, opacity }: { amber: string; opacity: number }): JSX.Element {
  const fluteW = 0.09 * W
  const lefts = [0, 0.25 * W, 0.5 * W, 0.75 * W]
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: '100%', display: 'flex' }}>
      {lefts.map((left, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left,
            width: fluteW,
            height: '100%',
            backgroundColor: amber,
            opacity,
          }}
        />
      ))}
    </div>
  )
}

// Capitel/base: duas barras horizontais âmbar empilhadas e centradas.
function Capital({ amber, flip }: { amber: string; flip: boolean }): JSX.Element {
  const wide: CSSProperties = { width: 1.8 * W, height: 10, backgroundColor: amber }
  const narrow: CSSProperties = { width: 1.36 * W, height: 7, backgroundColor: amber }
  const bars = flip ? [narrow, wide] : [wide, narrow]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {bars.map((s, i) => (
        <div key={i} style={s} />
      ))}
    </div>
  )
}

export function Column({
  background,
  index,
  total,
}: {
  background: Background
  index: number // 0-based
  total: number
}): JSX.Element {
  const amber = amberFor(background)
  const progress = Math.min(1, Math.max(0, (index + 1) / total))

  return (
    <div
      style={{
        position: 'absolute',
        top: COLUMN.top,
        left: COLUMN.left,
        width: W,
        height: COLUMN.height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Capital amber={amber} flip={false} />

      {/* Fuste: caneluras apagadas + progresso revelado por overflow:hidden */}
      <div style={{ position: 'relative', flex: 1, width: W, display: 'flex' }}>
        <Flutes amber={amber} opacity={0.24} />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: W,
            height: `${progress * 100}%`,
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          {/* Mesmo conjunto de caneluras, opacidade cheia. O wrapper acima corta. */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: COLUMN.height, display: 'flex' }}>
            <Flutes amber={amber} opacity={1} />
          </div>
        </div>
      </div>

      <Capital amber={amber} flip={true} />
    </div>
  )
}
