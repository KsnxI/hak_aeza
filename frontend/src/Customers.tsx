import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import { PageHeader } from './Layout'
import { SummaryCards } from './SummaryCards'
import type { RiskLevel } from './types'

export function Customers() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [level, setLevel] = useState<RiskLevel | 'all'>('all')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data } = useQuery({
    queryKey: ['customers', { search: debounced, level }],
    queryFn: () => api.customers({ search: debounced, level }),
  })

  return (
    <>
      <PageHeader title="Клиенты под риском" />

      <SummaryCards selected={level} onSelect={setLevel} />

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по email"
          className="w-64 rounded-lg border border-line bg-bg px-4 py-2 outline-none focus:border-accent"
        />

        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as RiskLevel | 'all')}
          className="rounded-lg border border-line bg-bg px-4 py-2 outline-none focus:border-accent"
        >
          <option value="all">Риски: Все</option>
          <option value="high">Высокий</option>
          <option value="medium">Средний</option>
          <option value="low">Низкий</option>
          <option value="none">Нет оценки</option>
        </select>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-live" />
          Обновлено сейчас
        </span>
      </div>

      <p className="mt-6 text-muted">
        Найдено клиентов: {data ? data.total : '…'}. Здесь будет таблица.
      </p>
    </>
  )
}
