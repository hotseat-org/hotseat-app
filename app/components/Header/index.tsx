import ArrowRight from '../icons/ArrowRight'
import ArrowLeft from '../icons/ArrowLeft'
import dayjs from 'dayjs'
import { Link, useSearchParams } from 'remix'

const Date = () => {
  const [searchParams] = useSearchParams()
  const date = searchParams.get('date') ?? dayjs()

  return (
    <div className="date">
      <div className="arrow">
        <Link
          to={`/seats/?date=${dayjs(date).subtract(1, 'day').toISOString()}`}
        >
          <ArrowLeft />
        </Link>
      </div>
      {dayjs(date).format('dddd DD/MM/YYYY')}
      <div className="arrow">
        <Link to={`/seats/?date=${dayjs(date).add(1, 'day').toISOString()}`}>
          <ArrowRight />
        </Link>
      </div>
    </div>
  )
}

export default Date
