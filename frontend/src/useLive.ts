import { useEffect, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { USE_MOCK } from './api'
import { mockBus, mockTick } from './mock'

let lastUpdate = Date.now()
const listeners = new Set<() => void>()

function touch() {
  lastUpdate = Date.now()
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useLastUpdate(): number {
  return useSyncExternalStore(subscribe, () => lastUpdate)
}

export function useLive() {
  const qc = useQueryClient()

  useEffect(() => {
    const refresh = () => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
      touch()
    }

    if (USE_MOCK) {
      mockBus.addEventListener('updated', refresh)
      const timer = window.setInterval(mockTick, 15000)
      return () => {
        mockBus.removeEventListener('updated', refresh)
        window.clearInterval(timer)
      }
    }

    const source = new EventSource('/api/v1/events')
    source.onmessage = refresh
    source.addEventListener('updated', refresh)
    return () => source.close()
  }, [qc])
}