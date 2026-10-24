import { ApiError } from './types'
import type {
  Customer,
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

const real = {
  login: (login: string, password: string) =>
    http<User>('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  me: () => http<User>('/auth/me'),
  logout: () => http<void>('/auth/logout', { method: 'POST' }),
  customers: (q: CustomersQuery = {}) => http<CustomersPage>(`/customers${toQuery(q)}`),
  customer: (id: number) => http<CustomerDetail>(`/customers/${id}`),
  summary: () => http<Summary>('/analytics/summary'),
  settings: () => http<ModelSettings>('/model/settings'),
  patchSettings: (patch: SettingsPatch) =>
    http<ModelSettings>('/model/settings', { method: 'PATCH', body: JSON.stringify(patch) }),
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
}

export const api = USE_MOCK ? fake : real
export type { Customer }
export { ApiError }
