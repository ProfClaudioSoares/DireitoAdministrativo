// Tipos espelhando o schema do Supabase (§5). Fonte de verdade do schema é o SQL
// em supabase/migrations; estes tipos são o contrato do cliente.

export type Pillar =
  | 'artigo_semana'
  | 'erro_certame'
  | 'decisao_comentada'
  | 'pergunta_licitante'
  | 'bastidores'

export const PILLARS: { value: Pillar; label: string }[] = [
  { value: 'artigo_semana', label: 'Artigo da semana' },
  { value: 'erro_certame', label: 'Erro em certame' },
  { value: 'decisao_comentada', label: 'Decisão comentada' },
  { value: 'pergunta_licitante', label: 'Pergunta do licitante' },
  { value: 'bastidores', label: 'Bastidores' },
]

export type PostStatus =
  | 'draft'
  | 'review'
  | 'blocked'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'failed'

export type TemplateId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7'

export interface Post {
  id: string
  owner_id: string
  title: string
  pillar: Pillar
  status: PostStatus
  caption: string | null
  hashtags: string[] | null
  scheduled_at: string | null
  published_at: string | null
  ig_media_id: string | null
  ig_parent_container_id: string | null
  ig_child_container_ids: string[] | null
  mixpost_post_uuid: string | null
  mixpost_media_ids: string[] | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface Slide {
  id: string
  owner_id: string
  post_id: string
  position: number
  template: TemplateId
  eyebrow: string | null
  title: string | null
  body: string | null
  citation: string | null
  rendered_url: string | null
  /** alt_text para leitores de tela (§7). Persistido junto ao slide. */
  alt_text?: string | null
}

export type CitationKind = 'dispositivo' | 'acordao' | 'sumula' | 'outro'

export interface Citation {
  id: string
  owner_id: string
  post_id: string
  slide_id: string | null
  raw_text: string
  text_hash: string
  kind: CitationKind
  verified: boolean
  verified_at: string | null
  source_note: string | null
}

export type FlagLayer = 'regex' | 'ia'
export type FlagSeverity = 'block' | 'warn'

export interface ComplianceFlag {
  id: string
  owner_id: string
  post_id: string
  rule: string
  layer: FlagLayer
  severity: FlagSeverity
  excerpt: string
  rationale: string
  resolved: boolean
  resolution_note: string | null
}

export interface Pauta {
  id: string
  owner_id: string
  topic: string
  pillar: Pillar
  notes: string | null
  used_at: string | null
}

// Forma que a IA devolve (validada por zod em lib/schema.ts).
export interface GeneratedSlide {
  template: TemplateId
  eyebrow: string | null
  title: string | null
  body: string | null
  citation: string | null
  alt_text: string
}

export interface GeneratedCarousel {
  title: string
  slides: GeneratedSlide[]
  caption: string
  hashtags: string[]
}
