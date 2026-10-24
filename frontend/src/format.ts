export function formatMoney(units: number): string {
  return (
    '€' +
    (units / 100).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}
