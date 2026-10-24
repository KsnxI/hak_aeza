import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from './api'
import { formatMoney } from './format'
import { PageHeader } from './Layout'
import { Pagination } from './Pagination'
import { RiskBadge } from './RiskBadge'
import { SummaryCards } from './SummaryCards'
import type { RiskLevel, SortField, SortOrder } from './types'
import { LiveIndicator } from './LiveIndicator'

const PAGE_SIZE = 20

const COLUMNS: { field: SortField; label: string }[] = [
  { field: 'id', label: 'ID' },
  { field: 'email', label: 'Email' },
  { field: 'balance', label: 'Баланс' },
  { field: 'totalReplenished', label: 'Пополнено' },
  { field: 'score', label: 'Score' },
]

export function Customers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [level, setLevel] = useState<RiskLevel | 'all'>('all')
  const [sort, setSort] = useState<SortField>('score')
  const [order, setOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)

  const { data, isPending } = useQuery({
    queryKey: ['customers', { search: debounced, level, sort, order, page }],
    queryFn: () => api.customers({ search: debounced, level, sort, order, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  function changeSearch(value: string) {
    setSearch(value)
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      setDebounced(value)
      setPage(1)
    }, 300)
  }

  function changeLevel(value: RiskLevel | 'all') {
    setLevel(value)
    setPage(1)
  }

  function toggleSort(field: SortField) {
    if (field === sort) {
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(field)
      setOrder(field === 'id' || field === 'email' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  return (
    <>
      <PageHeader title="Клиенты под риском" />

      <SummaryCards selected={level} onSelect={changeLevel} />

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <input
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          placeholder="Поиск по email"
          className="w-64 rounded-lg border border-line bg-bg px-4 py-2 outline-none focus:border-accent"
        />

        <select
          value={level}
          onChange={(e) => changeLevel(e.target.value as RiskLevel | 'all')}
          className="rounded-lg border border-line bg-bg px-4 py-2 outline-none focus:border-accent"
        >
          <option value="all">Риски: Все</option>
          <option value="high">Высокий</option>
          <option value="medium">Средний</option>
          <option value="low">Низкий</option>
          <option value="none">Нет оценки</option>
        </select>

        <LiveIndicator />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-muted">
              {COLUMNS.map((c) => {
                const active = c.field === sort
                return (
                  <th key={c.field} className="px-3 py-3 font-normal">
                    <button
                      onClick={() => toggleSort(c.field)}
                      className={'flex items-center gap-1 hover:text-white ' + (active ? 'text-white' : '')}
                    >
                      {c.label}
                      <span className={active ? 'text-accent' : ''}>
                        {active ? (order === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                )
              })}
              <th className="px-3 py-3 font-normal">Риск</th>
              <th className="px-3 py-3 font-normal">Причина</th>
            </tr>
          </thead>

          <tbody>
            {data?.items.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                className="cursor-pointer border-b border-line/50 hover:bg-bg/50"
              >
                <td className="px-3 py-3">{c.id}</td>
                <td className="px-3 py-3">{c.email}</td>
                <td className="px-3 py-3">{formatMoney(c.balance)}</td>
                <td className="px-3 py-3">{formatMoney(c.totalReplenished)}</td>
                <td className="px-3 py-3">
                  {c.score === null ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-8">{c.score}</span>
                      <div className="h-1 w-16 rounded bg-bg">
                        <div className="h-1 rounded bg-accent" style={{ width: `${c.score}%` }} />
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <RiskBadge level={c.level} />
                </td>
                <td className="px-3 py-3" title={c.reasons.join('\n')}>
                  {c.reasons[0]}
                  {c.reasons.length > 1 && <span className="text-muted"> +{c.reasons.length - 1}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isPending && <p className="p-6 text-muted">Загрузка…</p>}
        {data && data.items.length === 0 && <p className="p-6 text-muted">Клиенты не найдены</p>}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <span>
          Показано {from}-{to} из {total}
        </span>
        <Pagination page={page} total={pages} onChange={setPage} />
      </div>
    </>
  )
}

let timer = 0
