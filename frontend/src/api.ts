import { ApiError } from './types'
import type {
  CustomerDetail,
  CustomersPage,
  CustomersQuery,
  ModelSettings,
  SettingsPatch,
  Summary,
  User,
} from './types'
import * as mock from './mock'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const TOKEN_KEY = 'session_token'

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const res = await fetch(`/api/v1${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function toQuery(q: CustomersQuery): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== '' && v !== 'all') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

const LABELS: Record<string, string> = {
  prolong_wait: 'Ожидает оплаты',
  insufficient_balance: 'Не хватает средств',
  autoprolong_disabled: 'Автопродление выключено',
}

type FlatSettings = Record<string, unknown> & {
  high_threshold: number
  medium_threshold: number
}

function fromFlat(raw: FlatSettings): ModelSettings {
  const weights: Record<string, number> = {}
  const labels: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('weight_') && typeof value === 'number') {
      const name = key.slice('weight_'.length)
      weights[name] = value
      labels[name] = LABELS[name] ?? name
    }
  }
  return {
    weights,
    labels,
    thresholds: { high: raw.high_threshold, medium: raw.medium_threshold },
  }
}

function toFlat(patch: SettingsPatch): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [name, value] of Object.entries(patch.weights ?? {})) {
    out[`weight_${name}`] = value
  }
  if (patch.thresholds?.high !== undefined) out.high_threshold = patch.thresholds.high
  if (patch.thresholds?.medium !== undefined) out.medium_threshold = patch.thresholds.medium
  return out
}

async function me(): Promise<User> {
  const u = await http<{ username?: string; login?: string }>('/auth/me')
  return { login: u.username ?? u.login ?? '' }
}

async function login(name: string, password: string): Promise<User> {
  const res = await http<{ access_token?: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: name, password }),
  })
  if (res?.access_token) sessionStorage.setItem(TOKEN_KEY, res.access_token)
  return me()
}

async function logout(): Promise<void> {
  try {
    await http<unknown>('/auth/logout', { method: 'POST' })
  } finally {
    sessionStorage.removeItem(TOKEN_KEY)
  }
}

const real = {
  login,
  me,
  logout,
  customers: (q: CustomersQuery = {}) => http<CustomersPage>(`/customers${toQuery(q)}`),
  customer: (id: number) => http<CustomerDetail>(`/customers/${id}`),
  summary: () => http<Summary>('/analytics/summary'),
  settings: async () => fromFlat(await http<FlatSettings>('/model/settings')),
  patchSettings: async (patch: SettingsPatch) =>
    fromFlat(
      await http<FlatSettings>('/model/settings', {
        method: 'PATCH',
        body: JSON.stringify(toFlat(patch)),
      }),
    ),
  uploadSnapshot: (json: string) => http<unknown>('/source/snapshot', { method: 'PUT', body: json }),
}

const fake: typeof real = {
  login: mock.login,
  me: mock.me,
  logout: mock.logout,
  customers: mock.getCustomers,
  customer: mock.getCustomer,
  summary: mock.getSummary,
  settings: mock.getSettings,
  patchSettings: mock.patchSettings,
  uploadSnapshot: mock.putSnapshot,
}

export const api = USE_MOCK ? fake : real
export { ApiError }