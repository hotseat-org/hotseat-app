import { LoaderFunction, useLoaderData } from 'remix'

import { getRows } from '~/services/db/rows.server.js'

import office from '../../images/office.png'
import logo1 from '../../images/logo1.png'
import logo2 from '../../images/logo2.png'
import logo1white from '../../images/logo1white.png'
import logo2white from '../../images/logo2white.png'
import logoresident from '../../images/logoresident.png'

export const loader: LoaderFunction = async () => {
  const rows = await getRows({ from: new Date(), to: new Date() })

  return {
    rows,
  }
}

const seatRows = [
  {
    info: {
      logo: logo1,
      stopLogo: logo1white,
      positioning: 'absolute top-10 left-16',
      imageClassname: 'w-12 pt-8',
    },
    users: [
      { q: 1, free: false, resident: false },
      { q: 2, free: true, resident: false },
      { q: 3, free: false, resident: true },
      { q: 4, free: true, resident: true },
      { q: 5, free: true, resident: false },
    ],
  },
  {
    info: {
      logo: logo2,
      stopLogo: logo2white,
      positioning: 'absolute top-14 left-56 flex',
      imageClassname: 'w-20 pr-8',
    },
    users: [
      { q: 1, free: true, resident: false },
      { q: 2, free: false, resident: false },
      { q: 3, free: true, resident: true },
      { q: 4, free: true, resident: false },
    ],
  },
  {
    info: {
      logo: logo1,
      stopLogo: logo1white,
      positioning: 'absolute top-28 right-10 flex',
      imageClassname: 'w-20 pr-8',
    },
    users: [
      { q: 1, free: true, resident: false },
      { q: 2, free: false, resident: false },
    ],
  },
  {
    info: {
      logo: logo2,
      stopLogo: logo2white,
      positioning: 'absolute top-52 right-10 flex',
      imageClassname: 'w-20 pr-8',
    },
    users: [
      { q: 1, free: true, resident: false },
      { q: 2, free: false, resident: false },
    ],
  },
  {
    info: {
      logo: logo1,
      stopLogo: logo1white,
      positioning: 'absolute top-64 right-2 flex',
      imageClassname: 'w-20 pr-8',
    },
    users: [
      { q: 1, free: true, resident: false },
      { q: 2, free: false, resident: false },
      { q: 3, free: false, resident: true },
    ],
  },
  {
    info: {
      logo: logo2,
      stopLogo: logo2white,
      positioning: 'absolute bottom-4 right-44 flex flex-col',
      imageClassname: 'w-12 pb-8',
    },
    users: [
      { q: 1, free: true, resident: false },
      { q: 2, free: true, resident: false },
      { q: 3, free: false, resident: true },
    ],
  },
  {
    info: {
      logo: logo1,
      stopLogo: logo1white,
      positioning: 'absolute bottom-2 right-16 flex flex-col',
      imageClassname: 'w-12 pb-6',
    },
    users: [
      { q: 1, free: true, resident: false },
      { q: 2, free: true, resident: false },
      { q: 3, free: false, resident: true },
      { q: 1, free: true, resident: false },
      { q: 3, free: false, resident: true },
    ],
  },
]

const getLogo = (item: any, logo: any, stopLogo: any) => {
  return item.resident === true ? logoresident : item.free ? logo : stopLogo
}

const Office = () => {
  const { rows } = useLoaderData()

  const data = Object.entries(rows).map((item) => {
    item.push({
      props: {
        0: {
          logo: logo1,
          stopLogo: logo1white,
          positioning: 'absolute top-10 left-16',
          imageClassname: 'w-12 pt-8',
        },
        1: {
          logo: logo2,
          stopLogo: logo2white,
          positioning: 'absolute top-14 left-56 flex',
          imageClassname: 'w-20 pr-8',
        },
        2: {
          logo: logo1,
          stopLogo: logo1white,
          positioning: 'absolute top-28 right-10 flex',
          imageClassname: 'w-20 pr-8',
        },
        3: {
          logo: logo2,
          stopLogo: logo2white,
          positioning: 'absolute top-52 right-10 flex',
          imageClassname: 'w-20 pr-8',
        },
        4: {
          logo: logo1,
          stopLogo: logo1white,
          positioning: 'absolute top-64 right-2 flex',
          imageClassname: 'w-20 pr-8',
        },
        5: {
          logo: logo2,
          stopLogo: logo2white,
          positioning: 'absolute bottom-4 right-44 flex flex-col',
          imageClassname: 'w-12 pb-8',
        },
        6: {
          logo: logo1,
          stopLogo: logo1white,
          positioning: 'absolute bottom-2 right-16 flex flex-col',
          imageClassname: 'w-12 pb-6',
        },
      },
    })
    return item
  })


  return (
    <div className=" flex p-16 w-128 items-center justify-center">
      <div className="relative">
        <img className="" src={office} alt="" />
        {seatRows.map((item, index) => (
          <div key={index} className={item.info.positioning}>
            {item.users.map((user, userIndex) => (
              <img
                key={index + userIndex}
                src={getLogo(user, item.info.logo, item.info.stopLogo)}
                alt=""
                className={item.info.imageClassname}
                onClick={() => console.log('click', index, userIndex)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Office
