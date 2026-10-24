import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { formatMoney } from './format'
import { PageHeader } from './Layout'
import { RISK } from './risk'
import type { ModelSettings, RiskLevel, SettingsPatch } from './types'
import { SnapshotUpload } from './SnapshotUpload'

const LEVELS: RiskLevel[] = ['high', 'medium', 'low', 'none']

export function Settings() {
  const qc = useQueryClient()
  const { data, isPending, error } = useQuery({ queryKey: ['settings'], queryFn: api.settings })
  const { data: summary } = useQuery({ queryKey: ['summary'], queryFn: api.summary })

  const [weights, setWeights] = useState<Record<string, number>>({})
  const [thresholds, setThresholds] = useState({ high: 50, medium: 25 })
  const loaded = useRef(false)
  const timer = useRef(0)

  useEffect(() => {
    if (data && !loaded.current) {
      loaded.current = true
      setWeights(data.weights)
      setThresholds(data.thresholds)
    }
  }, [data])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const save = useMutation({
    mutationFn: (patch: SettingsPatch) => api.patchSettings(patch),
    onSuccess: (s: ModelSettings) => {
      qc.setQueryData(['settings'], s)
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
    },
  })

  function schedule(w: Record<string, number>, t: { high: number; medium: number }) {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => save.mutate({ weights: w, thresholds: t }), 300)
  }

  function changeWeight(name: string, value: number) {
    const next = { ...weights, [name]: value }
    setWeights(next)
    schedule(next, thresholds)
  }

  function changeThreshold(key: 'high' | 'medium', value: number) {
    const next =
      key === 'high'
        ? { high: Math.max(value, thresholds.medium + 1), medium: thresholds.medium }
        : { high: thresholds.high, medium: Math.min(value, thresholds.high - 1) }
    setThresholds(next)
    schedule(weights, next)
  }

  const total = Object.values(weights).reduce((a, b) => a + b, 0)

  let status = ''
  if (save.isPending) status = 'Сохранение…'
  else if (save.isError) status = 'Не удалось сохранить'
  else if (save.isSuccess) status = 'Сохранено'

  return (
    <>
      <PageHeader title="Настройки модели" />

      {isPending && <p className="text-muted">Загрузка…</p>}
      {error && <p className="text-accent">Не удалось загрузить настройки</p>}

      {data && (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-8">
            <section>
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-title font-semibold">Веса признаков</h2>
                <span className={save.isError ? 'text-accent' : 'text-muted'}>{status}</span>
              </div>
              <p className="mb-4 text-muted">
                Чем больше вес, тем сильнее признак влияет на score. Итоговый score считается как
                доля взвешенных признаков, поэтому важны пропорции между весами.
              </p>

              <div className="flex flex-col gap-4">
                {Object.keys(weights).map((name) => {
                  const w = weights[name]
                  const share = total > 0 ? Math.round((w / total) * 100) : 0
                  return (
                    <div key={name} className="rounded-lg bg-bg p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span>{data.labels[name] ?? name}</span>
                        <span className="text-muted">
                          {w.toFixed(2)} · доля {share}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={w}
                        onChange={(e) => changeWeight(name, Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-1 text-title font-semibold">Пороги уровней риска</h2>
              <p className="mb-4 text-muted">
                Score от порога включительно относится к уровню. Ниже порога среднего риска клиент
                считается низким.
              </p>

              <div className="flex flex-col gap-4">
                <div className="rounded-lg bg-bg p-4">
                  <div className="mb-2 flex justify-between">
                    <span>Высокий риск от</span>
                    <span className="text-muted">{thresholds.high}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={100}
                    step={1}
                    value={thresholds.high}
                    onChange={(e) => changeThreshold('high', Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                </div>

                <div className="rounded-lg bg-bg p-4">
                  <div className="mb-2 flex justify-between">
                    <span>Средний риск от</span>
                    <span className="text-muted">{thresholds.medium}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={99}
                    step={1}
                    value={thresholds.medium}
                    onChange={(e) => changeThreshold('medium', Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                </div>
              </div>
            </section>
            <SnapshotUpload />
          </div>

          <aside className="h-fit rounded-lg bg-bg p-6">
            <h2 className="mb-1 font-semibold">Результат сейчас</h2>
            <p className="mb-4 text-muted">Обновляется после каждого изменения.</p>

            <div className="flex flex-col gap-3">
              {LEVELS.map((level) => (
                <div key={level} className="flex items-center justify-between">
                  <span className={`rounded-full px-3 py-0.5 ${RISK[level].bg}`}>{RISK[level].label}</span>
                  <span className="font-semibold">{summary ? summary.counts[level] : '—'}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-line pt-4">
              <div className="text-muted">Потенциальные потери</div>
              <div className="text-title font-semibold">
                {summary ? formatMoney(summary.potentialLoss) : '—'}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}