import { useParams } from 'react-router-dom'
import { PageHeader } from './Layout'

export function Customer() {
  const { id } = useParams()
  return (
    <>
      <PageHeader title={`Клиент ${id}`} />
      <p className="text-muted">Здесь будет карточка клиента</p>
    </>
  )
}
