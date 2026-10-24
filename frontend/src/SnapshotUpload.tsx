import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

export function SnapshotUpload() {
  const qc = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  const upload = useMutation({
    mutationFn: async (f: File) => api.uploadSnapshot(await f.text()),
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
      setFile(null)
      if (input.current) input.current.value = ''
    },
  })

  function pick(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    upload.reset()
  }

  return (
    <section>
      <h2 className="mb-1 text-title font-semibold">Источник данных</h2>
      <p className="mb-4 text-muted">
        Загрузите JSON-снимок с аккаунтами, услугами и транзакциями. Данные заменяются целиком, score
        и денежная оценка пересчитываются автоматически.
      </p>

      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-bg p-4">
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          onChange={pick}
          className="file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-panel file:px-4 file:py-2 file:text-white"
        />

        <button
          onClick={() => file && upload.mutate(file)}
          disabled={!file || upload.isPending}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {upload.isPending ? 'Загрузка…' : 'Загрузить снимок'}
        </button>

        {upload.isSuccess && <span className="text-live">Снимок загружен, данные пересчитаны</span>}
        {upload.isError && (
          <span className="text-accent">Не удалось загрузить: {upload.error.message.slice(0, 200)}</span>
        )}
      </div>
    </section>
  )
}