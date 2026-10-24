import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="min-h-full bg-bg p-8">
      <div className="rounded-3xl bg-panel p-8">
        <h1 className="text-title font-semibold">Клиенты под риском</h1>
        <p className="mt-2 text-muted">Проверка темы и шрифта Inter</p>

        <div className="mt-6 flex gap-4">
          <div className="rounded bg-accent/70 px-6 py-4">Высокий 24</div>
          <div className="rounded bg-accent/50 px-6 py-4">Средний 56</div>
          <div className="rounded bg-accent/30 px-6 py-4">Низкий 68</div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-live" />
          Обновлено сейчас
        </div>

        <button className="mt-6 text-accent">Выйти</button>
      </div>
    </div>
  </StrictMode>,
)
