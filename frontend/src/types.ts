export type RiskLevel = 'high' | 'medium' | 'low' | 'none'
export type SortField = 'id' | 'email' | 'balance' | 'totalReplenished' | 'score'
export type SortOrder = 'asc' | 'desc'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export interface User {
  login: string
}

export interface Customer {
  id: number
  email: string
  balance: number
  totalReplenished: number
  score: number | null
  level: RiskLevel
  reasons: string[]
  potentialLoss: number
}

export interface Service {
  id: number
  name: string
  status: 'active' | 'suspended' | 'prolong_wait' | 'deleted' | 'blocked'
  price: number
  paymentTerm: 'hour' | 'week' | 'month' | 'quater_year' | 'half_year' | 'year'
  autoprolong: boolean
  expiresAt: string
}

export interface FeatureResult {
  name: string
  label: string
  value: number
  weight: number
  contribution: number
  reason: string
}

export interface CustomerDetail extends Customer {
  services: Service[]
  features: FeatureResult[]
}

export interface CustomersQuery {
  search?: string
  level?: RiskLevel | 'all'
  sort?: SortField
  order?: SortOrder
  page?: number
  pageSize?: number
}

export interface CustomersPage {
  items: Customer[]
  total: number
  page: number
  pageSize: number
}

export interface ChartPoint {
  date: string
  atRisk?: number
  atRiskForecast?: number
  deleted?: number
  expectedChurn?: number
}

export interface Summary {
  totalCustomers: number
  counts: Record<RiskLevel, number>
  potentialLoss: number
  servicesAtRisk: number
  lossExplanation?: string
  chart: ChartPoint[]
}

export interface ModelSettings {
  weights: Record<string, number>
  labels: Record<string, string>
  thresholds: { high: number; medium: number }
}

export interface SettingsPatch {
  weights?: Record<string, number>
  thresholds?: Partial<ModelSettings['thresholds']>
}