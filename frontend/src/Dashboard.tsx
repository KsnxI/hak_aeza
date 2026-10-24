import { useQuery } from '@tanstack/react-query'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from './api'
import { formatMoney } from './format'
import { PageHeader } from './Layout'
import { RISK } from './risk'
import type { RiskLevel } from './types'

const LEVELS: RiskLevel[] = ['high', 'medium', 'low', 'none']

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}

export function Dashboard() {
  const { data, isPending, error } = useQuery({
    queryKey: ['summary'],
    queryFn: api.summary,
  })

  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      <PageHeader title="Дашборд" />

      {isPending && <p className="text-muted">Загрузка…</p>}
      {error && <p className="text-accent">Не удалось загрузить сводку</p>}

      {data && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-lg bg-bg px-6 py-4">
              <div className="text-muted">Всего клиентов</div>
              <div className="text-title font-semibold">{data.totalCustomers}</div>
            </div>
            <div className="rounded-lg bg-bg px-6 py-4">
              <div className="text-muted">Высокий риск</div>
              <div className="text-title font-semibold">{data.counts.high}</div>
            </div>
            <div className="rounded-lg bg-bg px-6 py-4">
              <div className="text-muted">Услуг под риском</div>
              <div className="text-title font-semibold">{data.servicesAtRisk}</div>
            </div>
            <div className="rounded-lg bg-accent/70 px-6 py-4">
              <div>Потенциальные потери</div>
              <div className="text-title font-semibold">{formatMoney(data.potentialLoss)}</div>
              <div>за месяц</div>
            </div>
          </div>

          <section className="rounded-lg bg-bg p-6">
            <h2 className="mb-2 font-semibold">Что означает эта сумма</h2>
            <p className="text-muted">
              Для каждого клиента берём месячную стоимость всех его действующих услуг и умножаем
              на его риск (score от 0 до 100%). Сумма по всем клиентам показывает, сколько выручки
              бизнес может потерять за месяц, если риск реализуется. Чем выше score и дороже
              услуги, тем больше вклад клиента. Клиенты без оценки в расчёт не входят.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-title font-semibold">Клиенты по уровням риска</h2>
            <div className="flex flex-col gap-3">
              {LEVELS.map((level) => {
                const count = data.counts[level]
                const pct = data.totalCustomers ? (count / data.totalCustomers) * 100 : 0
                return (
                  <div key={level} className="flex items-center gap-4">
                    <div className="w-32">{RISK[level].label}</div>
                    <div className="h-3 flex-1 rounded bg-bg">
                      <div
                        className={`h-3 rounded ${level === 'none' ? 'bg-muted' : RISK[level].bg.split(' ')[0]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-24 text-right">
                      {count} ({Math.round(pct)}%)
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-title font-semibold">Динамика оттока</h2>
            <p className="mb-4 text-muted">
              Количество услуг под риском. Сплошная линия показывает факт, пунктир показывает
              прогноз.
            </p>

            <div className="h-80 rounded-lg bg-bg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chart} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#444444" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={shortDate} stroke="#9a9a9a" />
                  <YAxis stroke="#9a9a9a" allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(label) => shortDate(String(label))}
                    contentStyle={{ background: '#303030', border: '1px solid #444444', color: '#ffffff' }}
                  />
                  <Legend />
                  <ReferenceLine x={today} stroke="#9a9a9a" label={{ value: 'сегодня', fill: '#9a9a9a' }} />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Факт"
                    stroke="#ffffff"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="Прогноз"
                    stroke="#FF5E00"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
