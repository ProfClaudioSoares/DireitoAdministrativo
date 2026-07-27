import { create } from 'zustand'
import { supabase } from './supabase'
import type { Citation, ComplianceFlag, Post, Slide } from './types'

interface StudioState {
  post: Post | null
  slides: Slide[]
  citations: Citation[]
  flags: ComplianceFlag[]
  loading: boolean
  selectedSlideId: string | null
  load: (postId: string) => Promise<void>
  select: (slideId: string) => void
  updateSlide: (slideId: string, patch: Partial<Slide>) => Promise<void>
  reset: () => void
}

export const useStudio = create<StudioState>((set, get) => ({
  post: null,
  slides: [],
  citations: [],
  flags: [],
  loading: false,
  selectedSlideId: null,

  async load(postId) {
    set({ loading: true })
    const [{ data: post }, { data: slides }, { data: citations }, { data: flags }] = await Promise.all([
      supabase.from('posts').select('*').eq('id', postId).single(),
      supabase.from('slides').select('*').eq('post_id', postId).order('position'),
      supabase.from('citations').select('*').eq('post_id', postId),
      supabase.from('compliance_flags').select('*').eq('post_id', postId),
    ])
    const list = (slides as Slide[]) ?? []
    const current = get().selectedSlideId
    set({
      post: post as Post | null,
      slides: list,
      citations: (citations as Citation[]) ?? [],
      flags: (flags as ComplianceFlag[]) ?? [],
      // preserva a seleção atual se o slide ainda existe; senão, o primeiro.
      selectedSlideId: current && list.some((s) => s.id === current) ? current : (list[0]?.id ?? null),
      loading: false,
    })
  },

  select(slideId) {
    set({ selectedSlideId: slideId })
  },

  async updateSlide(slideId, patch) {
    const { data, error } = await supabase.from('slides').update(patch).eq('id', slideId).select().single()
    if (error) throw new Error(error.message)
    if (!data) return
    // Atualiza só o slide alterado — NÃO recarrega tudo (isso resetava a seleção).
    set({ slides: get().slides.map((s) => (s.id === slideId ? (data as Slide) : s)) })
    // Reflete um possível rebaixamento de status pelo trigger, sem mexer na seleção.
    const pid = get().post?.id
    if (pid) {
      const { data: post } = await supabase.from('posts').select('*').eq('id', pid).single()
      if (post) set({ post: post as Post })
    }
  },

  reset() {
    set({ post: null, slides: [], citations: [], flags: [], selectedSlideId: null })
  },
}))
