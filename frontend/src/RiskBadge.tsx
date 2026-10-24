import { RISK } from './risk'
import type { RiskLevel } from './types'

export function RiskBadge({ level }: { level: RiskLevel }) {
  const r = RISK[level]
  return <span className={`inline-block rounded-full px-3 py-0.5 ${r.bg}`}>{r.label}</span>
}
