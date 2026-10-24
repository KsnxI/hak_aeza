import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from './api'
import { formatDate, formatMoney, STATUS_LABEL, TERM_LABEL } from './format'
import { PageHeader } from './Layout'
import { RiskBadge } from './RiskBadge'

export function Customer() {
  const { id } = useParams()
  const customerId = Number(id)

  const { data, isPending, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => api.customer(customerId),
    enabled: !Number.isNaN(customerId),
  })

  const notFound = error instanceof ApiError && error.status === 404

  return (
    <>
      <PageHeader title={data ? data.email : `Клиент ${id}`} />

      <Link to="/customers" className="mb-6 inline-block text-accent hover:underline">
        ← Ко всем клиентам
      </Link>

      {isPending && <p className="text-muted">Загрузка…</p>}
      {notFound && <p className="text-muted">Клиент не найден</p>}
      {error && !notFound && <p className="text-accent">Не удалось загрузить данные клиента</p>}

      {data && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-lg bg-bg px-6 py-4">
              <div className="text-muted">Score</div>
              <div className="text-title font-semibold">{data.score ?? '—'}</div>
            </div>
            <div className="rounded-lg bg-bg px-6 py-4">
              <div className="text-muted">Уровень риска</div>
              <div className="mt-1">
                <RiskBadge level={data.level} />
              </div>
            </div>
            <div className="rounded-lg bg-bg px-6 py-4">
              <div className="text-muted">Потенциальные потери</div>
              <div className="text-title font-semibold">{formatMoney(data.potentialLoss)}</div>
              <div className="text-muted">за месяц, с учётом риска</div>
            </div>
            <div className="rounded-lg bg-bg px-6 py-4">
              <div className="text-muted">Баланс / пополнено</div>
              <div className="font-semibold">{formatMoney(data.balance)}</div>
              <div className="text-muted">всего {formatMoney(data.totalReplenished)}</div>
            </div>
          </div>

          <section>
            <h2 className="mb-3 text-title font-semibold">Почему такая оценка</h2>

            {data.features.length === 0 ? (
              <p className="text-muted">Недостаточно данных для оценки: у клиента нет услуг.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="px-3 py-3 font-normal">Признак</th>
                      <th className="px-3 py-3 font-normal">Выраженность</th>
                      <th className="px-3 py-3 font-normal">Вес</th>
                      <th className="px-3 py-3 font-normal">Вклад в score</th>
                      <th className="px-3 py-3 font-normal">Пояснение</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.features]
                      .sort((a, b) => b.contribution - a.contribution)
                      .map((f) => (
                        <tr key={f.name} className="border-b border-line/50">
                          <td className="px-3 py-3">{f.label}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1 w-24 rounded bg-bg">
                                <div
                                  className="h-1 rounded bg-accent"
                                  style={{ width: `${Math.round(f.value * 100)}%` }}
                                />
                              </div>
                              <span>{Math.round(f.value * 100)}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">{f.weight}</td>
                          <td className="px-3 py-3">+{f.contribution}</td>
                          <td className="px-3 py-3">{f.reason}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-title font-semibold">Услуги</h2>

            {data.services.length === 0 ? (
              <p className="text-muted">У клиента нет услуг</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="px-3 py-3 font-normal">Название</th>
                      <th className="px-3 py-3 font-normal">Статус</th>
                      <th className="px-3 py-3 font-normal">Цена</th>
                      <th className="px-3 py-3 font-normal">Период</th>
                      <th className="px-3 py-3 font-normal">Автопродление</th>
                      <th className="px-3 py-3 font-normal">Истекает</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.services.map((s) => (
                      <tr key={s.id} className="border-b border-line/50">
                        <td className="px-3 py-3">{s.name}</td>
                        <td className="px-3 py-3">{STATUS_LABEL[s.status]}</td>
                        <td className="px-3 py-3">{formatMoney(s.price)}</td>
                        <td className="px-3 py-3">{TERM_LABEL[s.paymentTerm]}</td>
                        <td className="px-3 py-3">
                          {s.autoprolong ? 'Включено' : <span className="text-accent">Выключено</span>}
                        </td>
                        <td className="px-3 py-3">{formatDate(s.expiresAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}
