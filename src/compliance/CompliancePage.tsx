import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStudio } from '@/lib/store'
import { supabase, invokeFunction, publishProvider } from '@/lib/supabase'

export default function CompliancePage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { post, citations, flags, load } = useStudio()
  const [busy, setBusy] = useState(false)
  const [when, setWhen] = useState('')
  const [schedErr, setSchedErr] = useState<string | null>(null)

  useEffect(() => {
    if (postId) void load(postId)
  }, [postId, load])

  const unverified = citations.filter((c) => !c.verified)
  const openBlocks = flags.filter((f) => f.severity === 'block' && !f.resolved)
  const canApprove = unverified.length === 0 && openBlocks.length === 0

  async function verifyCitation(id: string, source: string) {
    if (!source.trim()) return
    await supabase.from('citations').update({ verified: true, source_note: source }).eq('id', id)
    if (postId) await load(postId)
  }

  async function resolveFlag(id: string, note: string) {
    if (!note.trim()) return
    await supabase.from('compliance_flags').update({ resolved: true, resolution_note: note }).eq('id', id)
    if (postId) await load(postId)
  }

  async function approve() {
    if (!postId || !canApprove) return
    setBusy(true)
    await supabase.from('posts').update({ status: 'approved' }).eq('id', postId)
    setBusy(false)
    navigate('/agenda')
  }

  // Agenda direto daqui: aprova (se preciso) e agenda pelo provedor configurado.
  // Os triggers/functions validam citações, bloqueios e render — erros aparecem abaixo.
  async function scheduleNow() {
    if (!postId || !canApprove || !when) return
    setBusy(true)
    setSchedErr(null)
    try {
      const iso = new Date(when).toISOString()
      if (post && post.status !== 'approved' && post.status !== 'scheduled') {
        const { error } = await supabase.from('posts').update({ status: 'approved' }).eq('id', postId)
        if (error) throw new Error(error.message)
      }
      if (publishProvider === 'meta') {
        const { error } = await supabase.from('posts').update({ status: 'scheduled', scheduled_at: iso }).eq('id', postId)
        if (error) throw new Error(error.message)
      } else {
        await invokeFunction('mixpost-schedule', { post_id: postId, scheduled_at: iso })
      }
      navigate('/agenda')
    } catch (e) {
      setSchedErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!post) return <div className="px-6 py-12 text-grey">Carregando…</div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl mb-1">Portão de conformidade</h1>
      <p className="text-grey mb-8">
        {post.title} — status <span className="text-amber">{post.status}</span>
      </p>

      {/* Citações a verificar */}
      <section className="mb-12">
        <h2 className="text-sm uppercase tracking-widest text-grey mb-4">Citações a verificar</h2>
        {citations.length === 0 && <p className="text-grey/70">Nenhuma citação detectada.</p>}
        <div className="flex flex-col gap-3">
          {citations.map((c) => (
            <CitationRow key={c.id} raw={c.raw_text} verified={c.verified} note={c.source_note} onVerify={(s) => verifyCitation(c.id, s)} />
          ))}
        </div>
      </section>

      {/* Alertas de conformidade */}
      <section className="mb-12">
        <h2 className="text-sm uppercase tracking-widest text-grey mb-4">Alertas de conformidade</h2>
        {flags.length === 0 && <p className="text-grey/70">Sem alertas.</p>}
        <div className="flex flex-col gap-3">
          {flags.map((f) => (
            <FlagRow
              key={f.id}
              severity={f.severity}
              layer={f.layer}
              excerpt={f.excerpt}
              rationale={f.rationale}
              resolved={f.resolved}
              onResolve={(n) => resolveFlag(f.id, n)}
            />
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={approve}
          disabled={!canApprove || busy}
          className="bg-amber text-ink font-medium px-6 py-3 rounded disabled:opacity-40 hover:bg-amber-hi transition-colors"
        >
          Aprovar
        </button>

        {/* Agendar direto da conformidade */}
        <div className="flex items-center gap-2 border-l border-grey-dark/40 pl-4">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            disabled={!canApprove || busy}
            className="bg-transparent border border-grey-dark rounded px-3 py-2 text-sm focus:border-amber outline-none disabled:opacity-40"
          />
          <button
            onClick={scheduleNow}
            disabled={!canApprove || !when || busy}
            className="border border-amber text-amber font-medium px-5 py-2 rounded disabled:opacity-40 hover:bg-amber hover:text-ink transition-colors"
          >
            {busy ? '…' : 'Aprovar e agendar'}
          </button>
        </div>

        {!canApprove && (
          <span className="text-sm text-grey">
            {unverified.length > 0 && `${unverified.length} citação(ões) por verificar. `}
            {openBlocks.length > 0 && `${openBlocks.length} bloqueio(s) em aberto.`}
          </span>
        )}
      </div>
      {schedErr && <p className="text-red-400 text-sm mt-3">{schedErr}</p>}
    </div>
  )
}

function CitationRow({
  raw,
  verified,
  note,
  onVerify,
}: {
  raw: string
  verified: boolean
  note: string | null
  onVerify: (source: string) => void
}) {
  const [source, setSource] = useState(note ?? '')
  return (
    <div className={`border rounded p-4 ${verified ? 'border-green-700/50' : 'border-grey-dark'}`}>
      <div className="flex items-center justify-between">
        <code className="text-paper">{raw}</code>
        {verified ? (
          <span className="text-green-400 text-sm">conferida</span>
        ) : (
          <span className="text-amber text-sm">bloqueia publicação</span>
        )}
      </div>
      {!verified && (
        <div className="mt-3 flex gap-2">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Onde você conferiu na fonte? (obrigatório)"
            className="flex-1 bg-transparent border border-grey-dark rounded px-3 py-2 text-sm focus:border-amber outline-none"
          />
          <button onClick={() => onVerify(source)} disabled={!source.trim()} className="border border-amber text-amber rounded px-4 py-2 text-sm disabled:opacity-40">
            Conferi na fonte
          </button>
        </div>
      )}
    </div>
  )
}

function FlagRow({
  severity,
  layer,
  excerpt,
  rationale,
  resolved,
  onResolve,
}: {
  severity: 'block' | 'warn'
  layer: 'regex' | 'ia'
  excerpt: string
  rationale: string
  resolved: boolean
  onResolve: (note: string) => void
}) {
  const [note, setNote] = useState('')
  const color = severity === 'block' ? 'border-red-600/60' : 'border-amber/60'
  return (
    <div className={`border rounded p-4 ${resolved ? 'border-grey-dark opacity-60' : color}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs uppercase tracking-widest ${severity === 'block' ? 'text-red-400' : 'text-amber'}`}>
          {severity === 'block' ? 'Bloqueante' : 'Aviso'} · {layer}
        </span>
        {resolved && <span className="text-green-400 text-sm">resolvido</span>}
      </div>
      <p className="text-paper mb-1">“{excerpt}”</p>
      <p className="text-grey text-sm mb-3">{rationale}</p>
      {!resolved && (
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota de resolução (obrigatória)"
            className="flex-1 bg-transparent border border-grey-dark rounded px-3 py-2 text-sm focus:border-amber outline-none"
          />
          <button onClick={() => onResolve(note)} disabled={!note.trim()} className="border border-grey-dark rounded px-4 py-2 text-sm disabled:opacity-40 hover:border-amber">
            Resolver
          </button>
        </div>
      )}
    </div>
  )
}
