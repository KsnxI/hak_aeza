import { Navigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from './api'

export function RequireAuth() {
  const { isPending, isError } = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
  })

  if (isPending) return <div className="p-8 text-muted">Загрузка…</div>
  if (isError) return <Navigate to="/login" replace />
  return <Outlet />
}
