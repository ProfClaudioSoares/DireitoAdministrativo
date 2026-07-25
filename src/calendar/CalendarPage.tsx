import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Post } from '@/lib/types'

// Agenda simplificada (§6.4): lista de aprovados agendáveis + agendados.
// A grade mensal com drag-and-drop é o próximo passo; o núcleo é gravar
// scheduled_at e deixar o trigger de portão recusar transição inválida.
export default function CalendarPage() {
  const [approved, setApproved] = useState<Post[]>([])
  const [scheduled, setScheduled] = useState<Post[]>([])
  const [quota, setQuota] = useState<string>('—')
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from('posts').select('*').eq('status', 'approved').order('created_at'),
      supabase.from('posts').select('*').in('status', ['scheduled', 'published', 'failed']).order('scheduled_at'),
    ])
    setApproved((a as Post[]) ?? [])
    setScheduled((s as Post[]) ?? [])
  }

  useEffect(() => {
    void refresh()
    // Saldo da cota de publicação e status do token (§10) seriam consultados aqui
    // via uma função server-side; placeholder por ora.
    setQuota('consulte content_publishing_limit')
  }, [])

  async function schedule(post: Post, whenLocal: string) {
    setError(null)
    // Só aceita approved (§6.4). O trigger de banco recusa se houver pendência.
    const iso = new Date(whenLocal).toISOString()
    const { error: err } = await supabase.from('posts').update({ status: 'scheduled', scheduled_at: iso }).eq('id', post.id)
    if (err) setError(err.message)
    await refresh()
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Agenda</h1>
        <span className="text-xs text-grey">Cota de publicação: {quota}</span>
      </div>

      {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

      <section className="mb-12">
        <h2 className="text-sm uppercase tracking-widest text-grey mb-4">Aprovados — prontos para agendar</h2>
        {approved.length === 0 && <p className="text-grey/70">Nenhum post aprovado.</p>}
        <div className="flex flex-col gap-3">
          {approved.map((p) => (
            <ScheduleRow key={p.id} post={p} onSchedule={schedule} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-grey mb-4">Agendados / publicados</h2>
        {scheduled.length === 0 && <p className="text-grey/70">Nada agendado.</p>}
        <div className="flex flex-col gap-2">
          {scheduled.map((p) => (
            <div key={p.id} className="border border-grey-dark rounded px-4 py-3 flex items-center justify-between">
              <span>{p.title}</span>
              <span className="text-sm text-grey">
                {p.status} {p.scheduled_at ? `· ${new Date(p.scheduled_at).toLocaleString('pt-BR')}` : ''}
                {p.status === 'failed' && p.error_message ? ` · ${p.error_message}` : ''}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ScheduleRow({ post, onSchedule }: { post: Post; onSchedule: (p: Post, when: string) => void }) {
  const [when, setWhen] = useState('')
  return (
    <div className="border border-grey-dark rounded px-4 py-3 flex items-center justify-between gap-4">
      <span className="flex-1">{post.title}</span>
      <input
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        className="bg-transparent border border-grey-dark rounded px-3 py-2 text-sm focus:border-amber outline-none"
      />
      <button
        onClick={() => when && onSchedule(post, when)}
        disabled={!when}
        className="bg-amber text-ink rounded px-4 py-2 text-sm disabled:opacity-40 hover:bg-amber-hi"
      >
        Agendar
      </button>
    </div>
  )
}
