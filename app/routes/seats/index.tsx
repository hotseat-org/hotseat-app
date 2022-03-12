import { LoaderFunction, useLoaderData } from 'remix'

import { getRows } from '~/services/db/rows.server.js'

export const loader: LoaderFunction = async () => {
  const rows = await getRows({ from: new Date(), to: new Date() })

  return {
    rows,
  }
}

const Seats = () => {
  const { rows } = useLoaderData()
  console.log(rows)

  return <div>Seats</div>
}

export default Seats
