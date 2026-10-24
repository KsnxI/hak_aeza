import { ApiError } from './types'
import type {
  ChartPoint,
  Customer,
  CustomerDetail,
  CustomersPage,
  CustomersQuery,
  FeatureResult,
  ModelSettings,
  RiskLevel,
  Service,
  SettingsPatch,
  Summary,
  User,
} from './types'

const DAY = 86400000
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const mockBus = new EventTarget()

const FEATURES: Record<string, { label: string; weight: number }> = {
  autoprolong_off: { label: 'Автопродление выключено', weight: 0.35 },
  low_balance: { label: 'Не хватает средств', weight: 0.4 },
  prolong_wait: { label: 'Ожидает оплаты', weight: 0.25 },
}

const DEFAULT_SETTINGS: ModelSettings = {
  weights: Object.fromEntries(Object.entries(FEATURES).map(([k, v]) => [k, v.weight])),
  labels: Object.fromEntries(Object.entries(FEATURES).map(([k, v]) => [k, v.label])),
  thresholds: { high: 50, medium: 25 },
}

const SETTINGS_KEY = 'mock_settings'
const AUTH_KEY = 'mock_auth'

function loadSettings(): ModelSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as ModelSettings
      return {
        weights: { ...DEFAULT_SETTINGS.weights, ...saved.weights },
        labels: DEFAULT_SETTINGS.labels,
        thresholds: { ...DEFAULT_SETTINGS.thresholds, ...saved.thresholds },
      }
    }
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
  return structuredClone(DEFAULT_SETTINGS)
}

interface Raw {
  id: number
  email: string
  balance: number
  totalReplenished: number
  services: Service[]
}

const TERM_FACTOR: Record<Service['paymentTerm'], number> = {
  hour: 720,
  week: 4.3,
  month: 1,
  quater_year: 1 / 3,
  half_year: 1 / 6,
  year: 1 / 12,
}

const PRICE_RANGE: Record<Service['paymentTerm'], [number, number]> = {
  hour: [2, 6],
  week: [300, 1200],
  month: [500, 5000],
  quater_year: [1500, 9000],
  half_year: [3000, 15000],
  year: [6000, 30000],
}

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function generate(seed = 42): Raw[] {
  const rnd = rng(seed)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
  const names = ['vps-web', 'game-server', 'db-node', 'cdn-edge', 'backup', 'mail']
  const domains = ['mail.com', 'corp.ru', 'site.io', 'post.eu']
  const terms = Object.keys(PRICE_RANGE) as Service['paymentTerm'][]
  const now = Date.now()
  const list: Raw[] = []
  let sid = 1

  for (let i = 0; i < 231; i++) {
    const id = 1001 + i
    const empty = rnd() < 0.05
    const count = empty ? 0 : 1 + Math.floor(rnd() * 3)
    const services: Service[] = []

    for (let k = 0; k < count; k++) {
      const term = pick(terms)
      const [lo, hi] = PRICE_RANGE[term]
      const r = rnd()
      const status: Service['status'] =
        r < 0.7 ? 'active' : r < 0.8 ? 'prolong_wait' : r < 0.88 ? 'suspended' : r < 0.94 ? 'deleted' : 'blocked'
      const exp = status === 'prolong_wait' ? now - rnd() * 5 * DAY : now + (rnd() * 20 - 3) * DAY
      services.push({
        id: sid++,
        name: `${pick(names)}-${id}`,
        status,
        price: Math.round(lo + rnd() * (hi - lo)),
        paymentTerm: term,
        autoprolong: rnd() < 0.6,
        expiresAt: new Date(exp).toISOString(),
      })
    }

    list.push({
      id,
      email: `user${id}@${pick(domains)}`,
      balance: empty ? 0 : Math.round(rnd() * rnd() * 20000),
      totalReplenished: empty ? 0 : Math.round(rnd() * 100000),
      services,
    })
  }
  return list
}

let raws = generate()
let settings = loadSettings()

const monthly = (s: Service) => s.price * TERM_FACTOR[s.paymentTerm]
const isBillable = (s: Service) => s.status === 'active' || s.status === 'suspended' || s.status === 'prolong_wait'

function evaluate(c: Raw): Record<string, { value: number; reason: string }> {
  const billable = c.services.filter(isBillable)
  const cost = billable.reduce((a, s) => a + monthly(s), 0)
  const soon = Date.now() + 7 * DAY
  const apOff = billable.filter((s) => !s.autoprolong && new Date(s.expiresAt).getTime() < soon)
  const waiting = c.services.filter((s) => s.status === 'prolong_wait')
  const lack = cost > 0 ? Math.min(1, Math.max(0, 1 - c.balance / cost)) : 0
  const cantPay = waiting.length > 0 && c.balance < Math.min(...waiting.map((s) => s.price))

  return {
    autoprolong_off: {
      value: apOff.length ? 1 : 0,
      reason: apOff.length
        ? `Автопродление выключено, срок истекает скоро (услуг: ${apOff.length})`
        : 'Автопродление не создаёт риска',
    },
    low_balance: {
      value: Math.round(lack * 100) / 100,
      reason:
        lack >= 0.5
          ? `Баланс покрывает ${Math.round((1 - lack) * 100)}% месячных списаний`
          : 'Средств достаточно',
    },
    prolong_wait: {
      value: waiting.length ? (cantPay ? 1 : 0.6) : 0,
      reason: waiting.length
        ? cantPay
          ? 'Услуга ожидает оплаты, на балансе нет средств'
          : 'Услуга ожидает оплаты'
        : 'Нет услуг в ожидании оплаты',
    },
  }
}

interface Assessment {
  score: number | null
  level: RiskLevel
  features: FeatureResult[]
  reasons: string[]
  loss: number
}

function assess(c: Raw, st: ModelSettings): Assessment {
  if (c.services.length === 0) {
    return { score: null, level: 'none', features: [], reasons: ['Недостаточно данных'], loss: 0 }
  }
  const ev = evaluate(c)
  const total = Object.values(st.weights).reduce((a, b) => a + b, 0) || 1
  const features: FeatureResult[] = Object.entries(ev).map(([name, { value, reason }]) => {
    const weight = st.weights[name] ?? 0
    return {
      name,
      label: st.labels[name] ?? name,
      value,
      weight,
      contribution: Math.round(((value * weight) / total) * 100),
      reason,
    }
  })
  const raw = features.reduce((a, f) => a + f.value * f.weight, 0)
  const score = Math.min(100, Math.round((raw / total) * 100))
  const level: RiskLevel =
    score >= st.thresholds.high ? 'high' : score >= st.thresholds.medium ? 'medium' : 'low'
  const reasons = features
    .filter((f) => f.value >= 0.5)
    .sort((a, b) => b.contribution - a.contribution)
    .map((f) => f.reason)
  const cost = c.services.filter(isBillable).reduce((a, s) => a + monthly(s), 0)
  return {
    score,
    level,
    features,
    reasons: reasons.length ? reasons : ['Явных рисков нет'],
    loss: Math.round((score / 100) * cost),
  }
}

function toCustomer(c: Raw): Customer {
  const a = assess(c, settings)
  return {
    id: c.id,
    email: c.email,
    balance: c.balance,
    totalReplenished: c.totalReplenished,
    score: a.score,
    level: a.level,
    reasons: a.reasons,
    potentialLoss: a.loss,
  }
}

export async function login(name: string, password: string): Promise<User> {
  await sleep(200)
  if (name === 'admin' && password === 'admin') {
    localStorage.setItem(AUTH_KEY, name)
    return { login: name }
  }
  throw new ApiError(401, 'Неверный логин или пароль')
}

export async function me(): Promise<User> {
  await sleep(100)
  const name = localStorage.getItem(AUTH_KEY)
  if (!name) throw new ApiError(401, 'Не авторизован')
  return { login: name }
}

export async function logout(): Promise<void> {
  await sleep(100)
  localStorage.removeItem(AUTH_KEY)
}

export async function getCustomers(q: CustomersQuery = {}): Promise<CustomersPage> {
  await sleep(150)
  const { search = '', level = 'all', sort = 'score', order = 'desc', page = 1, pageSize = 20 } = q
  let items = raws.map(toCustomer)
  if (search) items = items.filter((c) => c.email.toLowerCase().includes(search.toLowerCase()))
  if (level !== 'all') items = items.filter((c) => c.level === level)
  const dir = order === 'asc' ? 1 : -1
  items.sort((a, b) => {
    const x = a[sort] ?? -1
    const y = b[sort] ?? -1
    const diff = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)
    return diff * dir
  })
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total: items.length,
    page,
    pageSize,
  }
}

export async function getCustomer(id: number): Promise<CustomerDetail> {
  await sleep(150)
  const c = raws.find((r) => r.id === id)
  if (!c) throw new ApiError(404, 'Клиент не найден')
  const a = assess(c, settings)
  return { ...toCustomer(c), services: c.services, features: a.features }
}

export async function getSummary(): Promise<Summary> {
  await sleep(150)
  const counts: Record<RiskLevel, number> = { high: 0, medium: 0, low: 0, none: 0 }
  let potentialLoss = 0
  let servicesAtRisk = 0
  let deletedTotal = 0

  for (const c of raws) {
    const a = assess(c, settings)
    counts[a.level]++
    potentialLoss += a.loss
    if (a.level === 'high' || a.level === 'medium') {
      servicesAtRisk += c.services.filter(isBillable).length
    }
    deletedTotal += c.services.filter((s) => s.status === 'deleted').length
  }

  const deletedPerDay = Math.round(deletedTotal / 14)
  const chart: ChartPoint[] = []

  for (let i = -7; i <= 7; i++) {
    const date = new Date(Date.now() + i * DAY).toISOString().slice(0, 10)
    const risk = Math.max(
      0,
      servicesAtRisk + Math.round(Math.sin(i * 1.3) * 3) + (i < 0 ? i : Math.round(i * 0.6)),
    )
    const deleted = Math.max(0, deletedPerDay + Math.round(Math.sin(i * 1.9)))
    const expected =
      i <= 0
        ? deleted
        : raws.reduce(
            (n, c) =>
              n +
              c.services.filter(
                (s) => isBillable(s) && !s.autoprolong && s.expiresAt.slice(0, 10) === date,
              ).length,
            0,
          )

    chart.push({
      date,
      ...(i <= 0 && { atRisk: risk, deleted }),
      ...(i >= 0 && { atRiskForecast: risk, expectedChurn: expected }),
    })
  }

  return {
    totalCustomers: raws.length,
    counts,
    potentialLoss,
    servicesAtRisk,
    chart,
    lossExplanation:
      'Для каждого клиента берётся месячная стоимость его действующих услуг, умноженная на score (0–100%). Сумма по всем клиентам показывает, сколько выручки можно потерять за месяц, если риск реализуется. Клиенты без оценки не учитываются.',
  }
}

export async function getSettings(): Promise<ModelSettings> {
  await sleep(100)
  return structuredClone(settings)
}

export async function patchSettings(patch: SettingsPatch): Promise<ModelSettings> {
  await sleep(100)
  const weights = { ...settings.weights }
  for (const [k, v] of Object.entries(patch.weights ?? {})) {
    if (k in weights) weights[k] = Math.min(1, Math.max(0, v))
  }
  settings = { ...settings, weights, thresholds: { ...settings.thresholds, ...patch.thresholds } }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  mockBus.dispatchEvent(new Event('updated'))
  return structuredClone(settings)
}

export async function putSnapshot(json: string): Promise<{ ok: boolean }> {
  await sleep(400)
  try {
    JSON.parse(json)
  } catch {
    throw new ApiError(400, 'Файл не является корректным JSON')
  }
  raws = generate(Math.floor(Math.random() * 1000000))
  mockBus.dispatchEvent(new Event('updated'))
  return { ok: true }
}

export function mockTick() {
  for (let i = 0; i < 3; i++) {
    const c = raws[Math.floor(Math.random() * raws.length)]
    c.balance = Math.max(0, c.balance + Math.round((Math.random() - 0.5) * 4000))
  }
  mockBus.dispatchEvent(new Event('updated'))
}