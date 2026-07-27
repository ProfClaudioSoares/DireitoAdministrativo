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
    set({
      post: post as Post | null,
      slides: (slides as Slide[]) ?? [],
      citations: (citations as Citation[]) ?? [],
      flags: (flags as ComplianceFlag[]) ?? [],
      selectedSlideId: (slides as Slide[])?.[0]?.id ?? null,
      loading: false,
    })
  },

  select(slideId) {
    set({ selectedSlideId: slideId })
  },

  async updateSlide(slideId, patch) {
    const { data } = await supabase.from('slides').update(patch).eq('id', slideId).select().single()
    if (data) {
      set({ slides: get().slides.map((s) => (s.id === slideId ? (data as Slide) : s)) })
      // O trigger de invalidação pode ter rebaixado o post — recarrega para refletir.
      if (get().post) void get().load(get().post!.id)
    }
  },

  reset() {
    set({ post: null, slides: [], citations: [], flags: [], selectedSlideId: null })
  },
}))
