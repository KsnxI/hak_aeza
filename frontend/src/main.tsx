import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { api } from './api'

function Test() {
  const [data, setData] = useState<unknown>(null)

  useEffect(() => {
    api
      .login('admin', 'admin')
      .then(() =>
        Promise.all([api.summary(), api.customers({ sort: 'score', order: 'desc', pageSize: 3 })]),
      )
      .then(setData)
  }, [])

  return <pre className="p-6 text-live">{JSON.stringify(data, null, 2)}</pre>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Test />
  </StrictMode>,
)
