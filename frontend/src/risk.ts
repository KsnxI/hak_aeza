import type { RiskLevel } from './types'

export const RISK: Record<RiskLevel, { label: string; bg: string }> = {
  high: { label: 'Высокий', bg: 'bg-accent/70 text-white' },
  medium: { label: 'Средний', bg: 'bg-accent/50 text-white' },
  low: { label: 'Низкий', bg: 'bg-accent/30 text-white' },
  none: { label: 'Нет оценки', bg: 'bg-line text-muted' },
}
