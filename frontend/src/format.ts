import type { Service } from './types'

export function formatMoney(units: number): string {
  return (
    '€' +
    (units / 100).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const TERM_LABEL: Record<Service['paymentTerm'], string> = {
  hour: 'Почасово',
  week: 'Неделя',
  month: 'Месяц',
  quater_year: 'Квартал',
  half_year: 'Полгода',
  year: 'Год',
}

export const STATUS_LABEL: Record<Service['status'], string> = {
  active: 'Активна',
  suspended: 'Выключена',
  prolong_wait: 'Ожидает оплаты',
  deleted: 'Удалена',
  blocked: 'Заблокирована',
}
