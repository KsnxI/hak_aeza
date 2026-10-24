import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import { formatMoney } from './format'
import { RISK } from './risk'
import type { RiskLevel } from './types'

interface Props {
  selected: RiskLevel | 'all'
  onSelect: (level: RiskLevel | 'all') => void
}

const LEVELS: RiskLevel[] = ['high', 'medium', 'low']

export function SummaryCards({ selected, onSelect }: Props) {
  const { data } = useQuery({ queryKey: ['summary'], queryFn: api.summary })

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {LEVELS.map((level) => (
        <button
          key={level}
          onClick={() => onSelect(selected === level ? 'all' : level)}
          className={
            'rounded-lg px-6 py-4 text-left transition ' +
            RISK[level].bg +
            (selected === level ? ' ring-2 ring-white' : '')
          }
        >
          <div>{RISK[level].label}</div>
          <div className="text-title font-semibold">{data ? data.counts[level] : '—'}</div>
        </button>
      ))}

      <div className="rounded-lg bg-bg px-6 py-4">
        <div>Потенциальные потери</div>
        <div className="text-title font-semibold">{data ? formatMoney(data.potentialLoss) : '—'}</div>
        <div className="text-muted">за месяц, с учётом риска</div>
      </div>
    </div>
  )
}
