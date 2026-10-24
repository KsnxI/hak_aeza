import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { Logo } from './Logo'
import { useLive } from './useLive'

const NAV = [
  { to: '/customers', label: 'Клиенты' },
  { to: '/dashboard', label: 'Дашборд' },
  { to: '/settings', label: 'Настройки' },
]

export function PageHeader({ title }: { title: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false })

  async function logout() {
    await api.logout()
    qc.clear()
    navigate('/login')
  }

  return (
    <header className="mb-8 flex items-center justify-between">
      <h1 className="text-title font-semibold">{title}</h1>
      <div className="flex items-center gap-6">
        <details className="relative">
          <summary className="cursor-pointer list-none">{user?.login ?? '…'} ▾</summary>
          <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg bg-bg p-2">
            <NavLink to="/settings" className="block rounded px-3 py-2 hover:bg-panel">
              Настройки модели
            </NavLink>
          </div>
        </details>
        <button onClick={logout} className="text-accent hover:underline">
          Выйти
        </button>
      </div>
    </header>
  )
}

export function Layout() {
  useLive()
  return (
    <div className="flex min-h-full gap-6 bg-bg p-6">
      <aside className="w-64 shrink-0 p-[30px]">
        <Logo height={28} />
        <nav className="mt-10 flex flex-col gap-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                'rounded-lg px-4 py-2 transition-colors ' +
                (isActive ? 'bg-panel text-accent' : 'text-white hover:bg-panel/60')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 rounded-3xl bg-panel p-8">
        <Outlet />
      </main>
    </div>
  )
}
