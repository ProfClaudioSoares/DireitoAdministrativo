import { useState } from 'react'
import { supabase, supabaseConfigured } from '@/lib/supabase'

// Tela de acesso. App de dono único: entrar ou criar a conta do titular.
export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        // onAuthStateChange no App cuida do redirecionamento.
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (!data.session) {
          setNotice('Conta criada. Confirme o e-mail (se a confirmação estiver ativa) e então entre.')
          setMode('signin')
        }
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="font-display text-3xl text-paper mb-1">
          Estúdio de Conteúdo <span className="text-amber">CS</span>
        </div>
        <p className="text-grey mb-8 text-sm">{mode === 'signin' ? 'Entrar na sua conta' : 'Criar a conta do titular'}</p>

        {!supabaseConfigured && (
          <div className="mb-6 border border-amber/60 bg-amber/10 text-amber rounded px-4 py-3 text-sm">
            Supabase não configurado. Copie <code>.env.example</code> para <code>.env</code> e preencha{' '}
            <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>, depois reinicie o <code>npm run dev</code>.
            Sem isso, login e dados não funcionam.
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-grey">E-mail</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 w-full bg-transparent border border-grey-dark rounded px-3 py-3 focus:border-amber outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-grey">Senha</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-2 w-full bg-transparent border border-grey-dark rounded px-3 py-3 focus:border-amber outline-none"
            />
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {notice && <p className="text-amber text-sm">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="bg-amber text-ink font-medium px-6 py-3 rounded disabled:opacity-40 hover:bg-amber-hi transition-colors"
          >
            {busy ? '…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
            setNotice(null)
          }}
          className="mt-6 text-sm text-grey hover:text-paper transition-colors"
        >
          {mode === 'signin' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}
