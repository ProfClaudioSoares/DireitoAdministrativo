import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStudio } from '@/lib/store'
import { loadBrandFonts } from '@/lib/fonts'
import { checkBodyFit, areFontsReady, BODY_MAX_CHARS_PER_LINE } from '@/lib/measure'
import { invokeFunction } from '@/lib/supabase'
import { CONTENT } from '@/templates/geometry'
import { TYPE } from '@/brand/tokens'
import type { TemplateId } from '@/lib/types'
import CanvasPreview from './CanvasPreview'

const TEMPLATES: TemplateId[] = ['T1', 'T2', 'T3', 'T4', 'T5']

export default function StudioPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { post, slides, load, selectedSlideId, select, updateSlide, loading } = useStudio()
  const [fontsReady, setFontsReady] = useState(areFontsReady())
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (postId) void load(postId)
  }, [postId, load])

  useEffect(() => {
    loadBrandFonts()
      .then(() => setFontsReady(true))
      .catch(() => setFontsReady(false))
  }, [])

  const selected = slides.find((s) => s.id === selectedSlideId) ?? slides[0]
  const locked = post?.status === 'approved' || post?.status === 'scheduled'

  async function runCompliance() {
    if (!postId) return
    setRunning(true)
    try {
      await invokeFunction('compliance-review', { post_id: postId })
      navigate(`/conformidade/${postId}`)
    } finally {
      setRunning(false)
    }
  }

  async function renderAll() {
    if (!postId) return
    // Orquestra um render por invocação (§9), com barra de progresso implícita.
    let next: number | null = slides[0]?.position ?? null
    while (next !== null) {
      const res: { next: number | null } = await invokeFunction('render-slides', { post_id: postId, position: next })
      next = res.next
    }
    await load(postId)
  }

  if (loading || !post) return <div className="px-6 py-12 text-grey">Carregando…</div>

  return (
    <div className="grid grid-cols-[1fr_420px] h-[calc(100vh-65px)]">
      {/* Coluna esquerda: preview + tira de slides */}
      <div className="overflow-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl">{post.title}</h1>
          <span className="text-xs uppercase tracking-widest text-grey border border-grey-dark rounded px-3 py-1">
            {post.status}
          </span>
        </div>

        {locked && (
          <div className="mb-6 border border-amber/60 bg-amber/10 text-amber rounded px-4 py-3 text-sm">
            Editar este post o devolve para rascunho e zera a conformidade.
          </div>
        )}

        {selected && (
          <div className="flex justify-center mb-8">
            <CanvasPreview slide={selected} total={slides.length} width={480} />
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          {slides.map((s) => (
            <button
              key={s.id}
              onClick={() => select(s.id)}
              className={`w-24 rounded overflow-hidden border ${s.id === selected?.id ? 'border-amber' : 'border-grey-dark'}`}
            >
              <CanvasPreview slide={s} total={slides.length} width={96} />
            </button>
          ))}
        </div>
      </div>

      {/* Painel lateral: campos do slide selecionado */}
      <aside className="border-l border-grey-dark/40 overflow-auto p-6 flex flex-col gap-5">
        {selected && (
          <>
            <div>
              <span className="text-xs uppercase tracking-widest text-grey">Template</span>
              <div className="mt-2 flex gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t}
                    onClick={() => updateSlide(selected.id, { template: t })}
                    className={`px-3 py-1 rounded border text-sm ${
                      selected.template === t ? 'border-amber text-amber' : 'border-grey-dark text-grey'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Field key={`eyebrow-${selected.id}`} label="Rótulo" value={selected.eyebrow ?? ''} onChange={(v) => updateSlide(selected.id, { eyebrow: v })} />
            <Field key={`title-${selected.id}`} label="Título" value={selected.title ?? ''} onChange={(v) => updateSlide(selected.id, { title: v })} />

            <BodyField key={`body-${selected.id}`} value={selected.body ?? ''} fontsReady={fontsReady} onChange={(v) => updateSlide(selected.id, { body: v })} />

            <Field key={`citation-${selected.id}`} label="Citação" value={selected.citation ?? ''} onChange={(v) => updateSlide(selected.id, { citation: v })} />

            <div className="border-t border-grey-dark/40 pt-4 flex flex-col gap-3">
              <button onClick={renderAll} className="border border-grey-dark rounded px-4 py-2 hover:border-amber transition-colors">
                Renderizar imagens
              </button>
              <button
                onClick={runCompliance}
                disabled={running}
                className="bg-amber text-ink font-medium rounded px-4 py-2 disabled:opacity-40 hover:bg-amber-hi transition-colors"
              >
                {running ? 'Analisando…' : 'Rodar conformidade'}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-grey">{label}</span>
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => local !== value && onChange(local)}
        className="mt-2 w-full bg-transparent border border-grey-dark rounded px-3 py-2 focus:border-amber outline-none"
      />
    </label>
  )
}

// Corpo: edição LOCAL (salva ao sair do campo — não a cada tecla) + contador ao vivo.
function BodyField({ value, fontsReady, onChange }: { value: string; fontsReady: boolean; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])

  const fit = useMemo(() => {
    if (!local) return null
    if (fontsReady) return checkBodyFit(local, TYPE.bodyMin, CONTENT.width)
    const over = local.split('\n').some((l) => l.length > BODY_MAX_CHARS_PER_LINE)
    return over ? { overflow: true, message: 'Este slide virou dois. Divida.' } : { overflow: false, message: '' }
  }, [local, fontsReady])

  return (
    <div>
      <span className="text-xs uppercase tracking-widest text-grey">Corpo</span>
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => local !== value && onChange(local)}
        rows={5}
        className={`mt-2 w-full bg-transparent border rounded px-3 py-2 outline-none ${
          fit?.overflow ? 'border-amber' : 'border-grey-dark focus:border-amber'
        }`}
      />
      {fit?.overflow && <p className="text-amber text-sm mt-1">{fit.message}</p>}
    </div>
  )
}
