import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export const Container = ({ children }: Props) => (
  <div className="p-6 lg:p-2 w-full flex justify-center items-center mt-4">
    <div className="flex flex-col gap-10 w-full lg:w-[1024px]">{children}</div>
  </div>
)
