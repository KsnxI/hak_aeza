import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api, USE_MOCK } from './api'
import { Logo } from './Logo'

export function Login() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await api.login(login, password)
      qc.setQueryData(['me'], user)
      navigate('/customers', { replace: true })
    } catch {
      setError('Неверный логин или пароль')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-bg p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-panel p-8">
        <Logo height={32} />
        <h1 className="mt-8 text-title font-semibold">Вход</h1>
        <p className="mt-1 text-muted">Анализатор рисков оттока</p>

        <label className="mt-6 block">
          Логин
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-line bg-bg px-4 py-2 outline-none focus:border-accent"
          />
        </label>

        <label className="mt-4 block">
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-line bg-bg px-4 py-2 outline-none focus:border-accent"
          />
        </label>

        {error && <p className="mt-4 text-accent">{error}</p>}

        <button
          type="submit"
          disabled={busy || !login || !password}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Входим…' : 'Войти'}
        </button>

        {USE_MOCK && <p className="mt-4 text-muted">Тестовый вход: admin / admin</p>}
      </form>
    </div>
  )
}
