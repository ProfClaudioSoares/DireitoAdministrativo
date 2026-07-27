import type { CSSProperties } from 'react'
import type { Background } from '@/brand/tokens.ts'
import type { TemplateId } from '@/lib/types.ts'

// Objetos de estilo inline TIPADOS (§4-A regra 3). Nada de Tailwind aqui —
// isto vira PNG. Apenas propriedades dentro do contrato de subconjunto do satori.
export type Style = CSSProperties

// Data URIs base64 dos PNGs de marca (§4/§9). Resolvidos ANTES do render.
export interface BrandAssets {
  monogramAmber: string // sobre ink
  monogramDark: string // sobre paper
  wordmark: string
}

// Conteúdo textual de um slide, o que o template consome.
export interface SlideContent {
  eyebrow?: string | null
  title?: string | null
  body?: string | null
  citation?: string | null
  /** imagem já resolvida (URL assinada no preview; data URI no satori). Templates T8/T9. */
  image?: string | null
}

export interface TemplateProps {
  content: SlideContent
  /** posição 0-based para o progresso da coluna. */
  index: number
  /** total de slides do carrossel. */
  total: number
  assets: BrandAssets
}

export interface TemplateMeta {
  id: TemplateId
  name: string
  background: Background
}
