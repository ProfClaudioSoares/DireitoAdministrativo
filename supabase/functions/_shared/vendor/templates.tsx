// ⚠ ARQUIVO GERADO por scripts/sync-functions-shared.mjs — NÃO EDITE À MÃO.
// Fonte única: src/templates/index.tsx. Rode o script após editar o original.

// ─────────────────────────────────────────────────────────────────────────────
// OS CINCO TEMPLATES — código ÚNICO (§3, §4). O MESMO componente alimenta:
//   • o preview do canvas (React DOM) e
//   • o PNG final (satori, na Edge Function render-slides).
//
// ⚠ Escritos DENTRO do contrato de subconjunto CSS do satori (§4-A):
//   layout só com flex; larguras explícitas em todo nó de texto; lineHeight
//   numérico; SEM Tailwind; âmbar SEMPRE via amberFor (§4), nunca literal;
//   âmbar apenas em fio (≤6px), numeral, coluna e marca — nunca em background.
// ─────────────────────────────────────────────────────────────────────────────

import type { CSSProperties, ReactNode } from 'react'
import { color, amberFor, TYPE, type Background } from './tokens.ts'
import type { TemplateId } from './app-types.ts'
import { Column } from './Column.tsx'
import { CONTENT, SLIDE_H, SLIDE_W } from './geometry.ts'
import type { BrandAssets, SlideContent, TemplateMeta, TemplateProps } from './types.ts'

// Assinatura fixa do titular (§7).
const OAB = 'OAB/RS 49.924'

function Frame({
  background,
  index,
  total,
  children,
}: {
  background: Background
  index: number
  total: number
  children: ReactNode
}): JSX.Element {
  return (
    <div
      style={{
        position: 'relative',
        width: SLIDE_W,
        height: SLIDE_H,
        backgroundColor: background,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <Column background={background} index={index} total={total} />
      <div
        style={{
          position: 'absolute',
          top: CONTENT.top,
          left: CONTENT.left,
          width: CONTENT.width,
          height: CONTENT.height,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function eyebrowStyle(background: Background): CSSProperties {
  return {
    fontFamily: 'Jost',
    fontWeight: 500,
    fontSize: TYPE.label,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: background === color.paper ? color.greyDark : color.grey,
    width: CONTENT.width,
    lineHeight: TYPE.lineHeight,
  }
}

function Monogram({ src, size }: { src: string; size: number }): JSX.Element {
  // eslint-disable-next-line jsx-a11y/alt-text -- satori não usa alt; a11y do post é o alt_text do slide
  return <img src={src} width={size} height={size} style={{ objectFit: 'contain' }} />
}

// ── T1 · Capa-tese (ink): rótulo · título grande · fio âmbar · monograma ──────
function T1({ content, index, total, assets }: TemplateProps): JSX.Element {
  const bg = color.ink
  const amber = amberFor(bg)
  return (
    <Frame background={bg} index={index} total={total}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div style={eyebrowStyle(bg)}>{content.eyebrow ?? ''}</div>
        <div style={{ display: 'flex', flexDirection: 'column', width: CONTENT.width }}>
          <div
            style={{
              fontFamily: 'Playfair Display',
              fontWeight: 500,
              fontSize: TYPE.title,
              color: color.paper,
              width: CONTENT.width,
              lineHeight: TYPE.lineHeight,
            }}
          >
            {content.title ?? ''}
          </div>
          {/* fio âmbar — altura ≤ 6px (§4) */}
          <div style={{ width: 220, height: 6, backgroundColor: amber, marginTop: 40 }} />
        </div>
        <div style={{ display: 'flex' }}>
          <Monogram src={assets.monogramAmber} size={120} />
        </div>
      </div>
    </Frame>
  )
}

// ── T2 · Conteúdo (paper): numeral queimado · subtítulo · corpo · monograma escuro
function T2({ content, index, total, assets }: TemplateProps): JSX.Element {
  const bg = color.paper
  const amber = amberFor(bg) // amber-burnt — sobre papel, sempre a variante queimada
  return (
    <Frame background={bg} index={index} total={total}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: CONTENT.width }}>
          {/* numeral queimado — âmbar em numeral é permitido (§4) */}
          <div
            style={{
              fontFamily: 'Playfair Display',
              fontWeight: 500,
              fontSize: 140,
              color: amber,
              lineHeight: 1,
              width: CONTENT.width,
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </div>
          <div
            style={{
              fontFamily: 'Playfair Display',
              fontWeight: 500,
              fontSize: TYPE.subtitle,
              color: color.ink,
              width: CONTENT.width,
              lineHeight: TYPE.lineHeight,
              marginTop: 24,
            }}
          >
            {content.title ?? ''}
          </div>
          <div
            style={{
              fontFamily: 'Jost',
              fontWeight: 300,
              fontSize: TYPE.body, // 53 — mínimo absoluto, ≤24 chars/linha (garantido no editor)
              color: color.greyDark,
              width: CONTENT.width,
              lineHeight: TYPE.lineHeight,
              marginTop: 40,
              whiteSpace: 'pre-wrap',
            }}
          >
            {content.body ?? ''}
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <Monogram src={assets.monogramDark} size={100} />
        </div>
      </div>
    </Frame>
  )
}

// ── T3 · Dispositivo (ink): rótulo · texto legal em itálico · citação em âmbar ─
function T3({ content, index, total }: TemplateProps): JSX.Element {
  const bg = color.ink
  const amber = amberFor(bg)
  return (
    <Frame background={bg} index={index} total={total}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div style={eyebrowStyle(bg)}>{content.eyebrow ?? 'DISPOSITIVO'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', width: CONTENT.width }}>
          {/* texto legal em itálico — corte itálico do Playfair (§4) */}
          <div
            style={{
              fontFamily: 'Playfair Display',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 60,
              color: color.paper,
              width: CONTENT.width,
              lineHeight: TYPE.lineHeight,
              whiteSpace: 'pre-wrap',
            }}
          >
            {content.body ?? ''}
          </div>
          {/* citação em âmbar */}
          <div
            style={{
              fontFamily: 'Jost',
              fontWeight: 500,
              fontSize: TYPE.label + 6,
              letterSpacing: 2,
              color: amber,
              width: CONTENT.width,
              lineHeight: TYPE.lineHeight,
              marginTop: 40,
            }}
          >
            {content.citation ?? ''}
          </div>
        </div>
        <div style={{ height: 1, width: 1 }} />
      </div>
    </Frame>
  )
}

// ── T4 · Tese (ink): rótulo · título · corpo curto ────────────────────────────
function T4({ content, index, total }: TemplateProps): JSX.Element {
  const bg = color.ink
  return (
    <Frame background={bg} index={index} total={total}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 40 }}>
        <div style={eyebrowStyle(bg)}>{content.eyebrow ?? ''}</div>
        <div
          style={{
            fontFamily: 'Playfair Display',
            fontWeight: 500,
            fontSize: TYPE.subtitle,
            color: color.paper,
            width: CONTENT.width,
            lineHeight: TYPE.lineHeight,
          }}
        >
          {content.title ?? ''}
        </div>
        <div
          style={{
            fontFamily: 'Jost',
            fontWeight: 300,
            fontSize: TYPE.body,
            color: color.grey,
            width: CONTENT.width,
            lineHeight: TYPE.lineHeight,
            whiteSpace: 'pre-wrap',
          }}
        >
          {content.body ?? ''}
        </div>
      </div>
    </Frame>
  )
}

// ── T5 · Fecho (ink): monograma grande · wordmark · OAB · CTA · ressalva ───────
function T5({ content, index, total, assets }: TemplateProps): JSX.Element {
  const bg = color.ink
  return (
    <Frame background={bg} index={index} total={total}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: CONTENT.width }}>
          <Monogram src={assets.monogramAmber} size={180} />
          <Monogram src={assets.wordmark} size={280} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', width: CONTENT.width, gap: 16 }}>
          {/* CTA informativa — NUNCA convite a contratar (§7/§8) */}
          <div
            style={{
              fontFamily: 'Jost',
              fontWeight: 500,
              fontSize: TYPE.label + 8,
              color: color.paper,
              width: CONTENT.width,
              lineHeight: TYPE.lineHeight,
            }}
          >
            {content.title ?? 'Siga para mais análises de licitações.'}
          </div>
          <div style={{ fontFamily: 'Jost', fontWeight: 500, fontSize: TYPE.label, color: color.grey, width: CONTENT.width, lineHeight: TYPE.lineHeight }}>
            Claudio Soares · {OAB}
          </div>
          {/* ressalva informativa obrigatória */}
          <div style={{ fontFamily: 'Jost', fontWeight: 300, fontSize: 26, color: color.greyDark, width: CONTENT.width, lineHeight: TYPE.lineHeight }}>
            {content.body ?? 'Conteúdo informativo. Não constitui consulta nem oferta de serviço.'}
          </div>
        </div>
      </div>
    </Frame>
  )
}

export const TEMPLATE_META: Record<TemplateId, TemplateMeta> = {
  T1: { id: 'T1', name: 'Capa-tese', background: color.ink },
  T2: { id: 'T2', name: 'Conteúdo', background: color.paper },
  T3: { id: 'T3', name: 'Dispositivo', background: color.ink },
  T4: { id: 'T4', name: 'Tese', background: color.ink },
  T5: { id: 'T5', name: 'Fecho', background: color.ink },
}

const REGISTRY: Record<TemplateId, (p: TemplateProps) => JSX.Element> = {
  T1,
  T2,
  T3,
  T4,
  T5,
}

/** Ponto único de render de um slide, por id de template. Usado no preview e no satori. */
export function SlideRenderer(props: TemplateProps & { template: TemplateId }): JSX.Element {
  const Cmp = REGISTRY[props.template]
  return <Cmp {...props} />
}

export type { BrandAssets, SlideContent, TemplateProps }
