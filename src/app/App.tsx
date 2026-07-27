import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import GeneratorPage from '@/generator/GeneratorPage'
import StudioPage from '@/studio/StudioPage'
import CompliancePage from '@/compliance/CompliancePage'
import CalendarPage from '@/calendar/CalendarPage'
import LibraryPage from '@/library/LibraryPage'
import Login from './Login'
import { useSession, signOut } from '@/lib/auth'
import { supabaseConfigured } from '@/lib/supabase'

function ConfigNeeded() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md">
        <div className="font-display text-3xl text-paper mb-3">
          Estúdio de Conteúdo <span className="text-amber">CS</span>
        </div>
        <div className="border border-amber/60 bg-amber/10 text-amber rounded px-4 py-3 text-sm">
          Configure o Supabase para usar o app: defina <code>VITE_SUPABASE_URL</code> e{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> (no <code>.env</code> local ou nas variáveis do Vercel) e recarregue.
        </div>
      </div>
    </div>
  )
}

const NAV = [
  { to: '/gerar', label: 'Gerar' },
  { to: '/biblioteca', label: 'Biblioteca' },
  { to: '/agenda', label: 'Agenda' },
]

export default function App() {
  const { session, loading } = useSession()

  // Backend obrigatório: sem config do Supabase, orienta em vez de quebrar.
  if (!supabaseConfigured) return <ConfigNeeded />

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-grey">Carregando…</div>
  }

  // Gate de autenticação: sem sessão, a RLS (owner_id = auth.uid()) barra tudo.
  if (!session) return <Login />

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-grey-dark/40 px-6 py-4 flex items-center gap-8">
        <div className="font-display text-2xl text-paper">
          Estúdio de Conteúdo <span className="text-amber">CS</span>
        </div>
        <nav className="flex gap-6 text-sm uppercase tracking-widest">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `transition-colors ${isActive ? 'text-amber' : 'text-grey hover:text-paper'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm text-grey">
          <span className="hidden sm:inline">{session.user.email}</span>
          <button onClick={() => void signOut()} className="hover:text-paper transition-colors">
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/gerar" replace />} />
          <Route path="/gerar" element={<GeneratorPage />} />
          <Route path="/estudio/:postId" element={<StudioPage />} />
          <Route path="/conformidade/:postId" element={<CompliancePage />} />
          <Route path="/agenda" element={<CalendarPage />} />
          <Route path="/biblioteca" element={<LibraryPage />} />
        </Routes>
      </main>
    </div>
  )
}
