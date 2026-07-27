import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { invokeFunction } from '@/lib/supabase'
import { createDemoPost } from '@/lib/demo'
import { PILLARS, type Pillar } from '@/lib/types'

const ANGLES = [
  { value: '', label: 'Sem ângulo' },
  { value: 'para quem nunca licitou', label: 'Para quem nunca licitou' },
  { value: 'para o jurídico interno', label: 'Para o jurídico interno' },
  { value: 'polêmico', label: 'Polêmico' },
]

export default function GeneratorPage() {
  const navigate = useNavigate()
  const [topic, setTopic] = useState('')
  const [pillar, setPillar] = useState<Pillar>('artigo_semana')
  const [count, setCount] = useState(7)
  const [angle, setAngle] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDemo() {
    setError(null)
    setDemoLoading(true)
    try {
      const postId = await createDemoPost()
      navigate(`/estudio/${postId}`)
    } catch (e) {
      setError((e as Error).message || 'Falha ao criar o exemplo.')
    } finally {
      setDemoLoading(false)
    }
  }

  async function onGenerate() {
    setError(null)
    setLoading(true)
    try {
      const { post_id } = await invokeFunction<{ post_id: string }>('generate-carousel', {
        topic,
        pillar,
        count,
        angle: angle || null,
      })
      navigate(`/estudio/${post_id}`)
    } catch (e) {
      setError((e as Error).message || 'Falha ao gerar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl mb-2">Gerar carrossel</h1>
      <p className="text-grey mb-8">Pauta jurídica → carrossel de Instagram na voz da marca.</p>

      <label className="block mb-6">
        <span className="text-xs uppercase tracking-widest text-grey">Tema</span>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="ex.: impugnação de edital"
          className="mt-2 w-full bg-transparent border border-grey-dark rounded px-3 py-3 focus:border-amber outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-grey">Pilar</span>
          <select
            value={pillar}
            onChange={(e) => setPillar(e.target.value as Pillar)}
            className="mt-2 w-full bg-ink border border-grey-dark rounded px-3 py-3 focus:border-amber outline-none"
          >
            {PILLARS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-grey">Cards (1 = post único)</span>
          <input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value))))}
            className="mt-2 w-full bg-transparent border border-grey-dark rounded px-3 py-3 focus:border-amber outline-none"
          />
        </label>
      </div>

      <label className="block mb-8">
        <span className="text-xs uppercase tracking-widest text-grey">Ângulo (opcional)</span>
        <select
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          className="mt-2 w-full bg-ink border border-grey-dark rounded px-3 py-3 focus:border-amber outline-none"
        >
          {ANGLES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          disabled={loading || !topic.trim()}
          onClick={onGenerate}
          className="bg-amber text-ink font-medium px-6 py-3 rounded disabled:opacity-40 hover:bg-amber-hi transition-colors"
        >
          {loading ? 'Gerando…' : 'Gerar carrossel'}
        </button>

        {/* Exemplo: cria um rascunho pronto no banco, sem chamar a IA — útil para
            testar o fluxo (renderizar → conformidade → agenda) sem gastar a chamada. */}
        <button
          disabled={demoLoading}
          onClick={onDemo}
          className="border border-grey-dark text-grey px-6 py-3 rounded disabled:opacity-40 hover:border-amber hover:text-paper transition-colors"
        >
          {demoLoading ? 'Criando…' : 'Criar exemplo'}
        </button>
      </div>
      <p className="text-xs text-grey/70 mt-3">
        “Gerar” usa a IA (chave no servidor). “Criar exemplo” insere um rascunho pronto sem IA, para testar o fluxo.
      </p>

      {loading && (
        <div className="mt-10 grid grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded bg-grey-dark/20 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  )
}
