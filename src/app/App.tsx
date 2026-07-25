import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import GeneratorPage from '@/generator/GeneratorPage'
import StudioPage from '@/studio/StudioPage'
import CompliancePage from '@/compliance/CompliancePage'
import CalendarPage from '@/calendar/CalendarPage'
import LibraryPage from '@/library/LibraryPage'

const NAV = [
  { to: '/gerar', label: 'Gerar' },
  { to: '/biblioteca', label: 'Biblioteca' },
  { to: '/agenda', label: 'Agenda' },
]

export default function App() {
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
