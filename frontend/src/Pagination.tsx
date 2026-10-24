interface Props {
  page: number
  total: number
  onChange: (page: number) => void
}

function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, current - 1, current, current + 1])
  const list = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  list.forEach((p, i) => {
    if (i > 0 && p - list[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

export function Pagination({ page, total, onChange }: Props) {
  if (total <= 1) return null

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="rounded px-3 py-1 hover:bg-bg disabled:opacity-30"
        aria-label="Назад"
      >
        ‹
      </button>

      {pageList(page, total).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-2 text-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={
              'rounded px-3 py-1 ' + (p === page ? 'bg-accent text-white' : 'hover:bg-bg')
            }
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === total}
        className="rounded px-3 py-1 hover:bg-bg disabled:opacity-30"
        aria-label="Вперёд"
      >
        ›
      </button>
    </div>
  )
}
