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

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
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

async function me(): Promise<User> {
  const u = await http<{ username?: string; login?: string }>('/auth/me')
  return { login: u.username ?? u.login ?? '' }
}

async function login(name: string, password: string): Promise<User> {
  await http<unknown>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: name, password }),
  })
  return me()
}

const real = {
  login,
  me,
  logout: () => http<void>('/auth/logout', { method: 'POST' }),
  customers: (q: CustomersQuery = {}) => http<CustomersPage>(`/customers${toQuery(q)}`),
  customer: (id: number) => http<CustomerDetail>(`/customers/${id}`),
  summary: () => http<Summary>('/analytics/summary'),
  settings: () => http<ModelSettings>('/model/settings'),
  patchSettings: (patch: SettingsPatch) =>
    http<ModelSettings>('/model/settings', { method: 'PATCH', body: JSON.stringify(patch) }),
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