import clsx from 'clsx'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  isWide?: boolean
}

export const Container = ({ children, isWide }: Props) => (
  <div className="p-6 lg:p-2 w-full flex justify-center items-center mt-4">
    <div
      className={clsx('flex flex-col gap-10 w-full lg:w-[1024px]', {
        'lg:w-[1248px]': isWide,
      })}
    >
      {children}
    </div>
  </div>
)
