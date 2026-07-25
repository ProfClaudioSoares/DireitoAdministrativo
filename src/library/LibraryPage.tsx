import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PILLARS, type Pillar, type Post, type PostStatus } from '@/lib/types'

const STATUSES: (PostStatus | 'todos')[] = ['todos', 'draft', 'review', 'blocked', 'approved', 'scheduled', 'published', 'failed']

export default function LibraryPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [pillar, setPillar] = useState<Pillar | 'todos'>('todos')
  const [status, setStatus] = useState<PostStatus | 'todos'>('todos')

  async function refresh() {
    let q = supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (pillar !== 'todos') q = q.eq('pillar', pillar)
    if (status !== 'todos') q = q.eq('status', status)
    const { data } = await q
    setPosts((data as Post[]) ?? [])
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pillar, status])

  // Duplicar como novo rascunho (§6.5): a cópia nasce em draft, sem citações
  // verificadas e sem flags resolvidas.
  async function duplicate(post: Post) {
    const { data: copy } = await supabase
      .from('posts')
      .insert({ title: `${post.title} (cópia)`, pillar: post.pillar, caption: post.caption, hashtags: post.hashtags, status: 'draft' })
      .select()
      .single()
    if (!copy) return
    const { data: slides } = await supabase.from('slides').select('*').eq('post_id', post.id).order('position')
    if (slides?.length) {
      await supabase.from('slides').insert(
        slides.map((s) => ({
          post_id: copy.id,
          position: s.position,
          template: s.template,
          eyebrow: s.eyebrow,
          title: s.title,
          body: s.body,
          citation: s.citation,
          alt_text: s.alt_text,
        })),
      )
    }
    await refresh()
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-6">Biblioteca</h1>

      <div className="flex gap-4 mb-8">
        <select value={pillar} onChange={(e) => setPillar(e.target.value as Pillar | 'todos')} className="bg-ink border border-grey-dark rounded px-3 py-2 text-sm">
          <option value="todos">Todos os pilares</option>
          {PILLARS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as PostStatus | 'todos')} className="bg-ink border border-grey-dark rounded px-3 py-2 text-sm">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {posts.map((p) => (
          <div key={p.id} className="border border-grey-dark rounded p-4 flex items-center justify-between">
            <div>
              <Link to={`/estudio/${p.id}`} className="text-paper hover:text-amber font-display text-lg">
                {p.title}
              </Link>
              <div className="text-xs text-grey mt-1">
                {p.pillar} · {p.status}
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={`/conformidade/${p.id}`} className="border border-grey-dark rounded px-3 py-1 text-sm hover:border-amber">
                Conformidade
              </Link>
              <button onClick={() => duplicate(p)} className="border border-grey-dark rounded px-3 py-1 text-sm hover:border-amber">
                Duplicar
              </button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-grey/70">Nada aqui ainda.</p>}
      </div>
    </div>
  )
}
