import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PILLARS, type Pillar, type Post, type PostStatus } from '@/lib/types'

const STATUSES: (PostStatus | 'todos')[] = ['todos', 'draft', 'review', 'blocked', 'approved', 'scheduled', 'published', 'failed']

// Rótulos em português para os status (§5).
const STATUS_LABEL: Record<PostStatus, string> = {
  draft: 'Rascunho',
  review: 'Em revisão',
  blocked: 'Bloqueado',
  approved: 'Aprovado',
  scheduled: 'Agendado',
  published: 'Publicado',
  failed: 'Falhou',
}

// Cor do selo por status (paleta padrão do Tailwind, preservada pelo extend).
const STATUS_CLASS: Record<PostStatus, string> = {
  draft: 'text-grey border-grey-dark',
  review: 'text-amber border-amber/60',
  blocked: 'text-red-300 border-red-600/60',
  approved: 'text-amber border-amber/60',
  scheduled: 'text-sky-300 border-sky-500/60',
  published: 'text-green-300 border-green-600/60',
  failed: 'text-red-300 border-red-600/60',
}

function statusLabel(s: PostStatus | 'todos'): string {
  return s === 'todos' ? 'Todos os status' : STATUS_LABEL[s]
}

// Data legível em pt-BR (dia/mês/ano hora:min). Vazio quando não houver data.
function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {posts.map((p) => (
          <div key={p.id} className="border border-grey-dark rounded p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <Link to={`/estudio/${p.id}`} className="text-paper hover:text-amber font-display text-lg leading-tight">
                {p.title}
              </Link>
              <span
                className={`shrink-0 text-[11px] uppercase tracking-widest border rounded-full px-2.5 py-1 ${STATUS_CLASS[p.status]}`}
              >
                {STATUS_LABEL[p.status]}
              </span>
            </div>

            <div className="text-xs text-grey">{p.pillar}</div>

            {/* Datas de agendamento e publicação */}
            {(p.scheduled_at || p.published_at) && (
              <div className="text-xs text-grey/90 flex flex-col gap-0.5">
                {p.scheduled_at && (
                  <span>
                    <span className="text-grey/60">Agendado para:</span> {fmtDate(p.scheduled_at)}
                  </span>
                )}
                {p.published_at && (
                  <span>
                    <span className="text-grey/60">Publicado em:</span> {fmtDate(p.published_at)}
                  </span>
                )}
              </div>
            )}

            {/* Mensagem de erro, quando a publicação falhou */}
            {p.status === 'failed' && p.error_message && (
              <div className="text-xs text-red-300 border border-red-600/40 rounded px-2 py-1">{p.error_message}</div>
            )}

            <div className="flex gap-2 mt-1">
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
