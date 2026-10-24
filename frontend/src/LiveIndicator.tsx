import { useSyncExternalStore } from 'react'
import { useLastUpdate } from './useLive'

let now = Date.now()
let timer = 0
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    now = Date.now()
    timer = window.setInterval(() => {
      now = Date.now()
      listeners.forEach((l) => l())
    }, 1000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.clearInterval(timer)
  }
}

function useNow(): number {
  return useSyncExternalStore(subscribe, () => now)
}

export function LiveIndicator() {
  const last = useLastUpdate()
  const current = useNow()

  const sec = Math.max(0, Math.floor((current - last) / 1000))
  let text = 'Обновлено сейчас'
  if (sec >= 5 && sec < 60) text = `Обновлено ${sec} с назад`
  else if (sec >= 60) text = `Обновлено ${Math.floor(sec / 60)} мин назад`

  return (
    <span className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full bg-live" />
      {text}
    </span>
  )
}