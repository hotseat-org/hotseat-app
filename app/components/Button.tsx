import type { ButtonProps } from '@nextui-org/button'
import { Button as NUIButton } from '@nextui-org/button'

interface Props extends ButtonProps {
  to?: string
  replace?: boolean
}

export const Button = (props: Props) => <NUIButton {...props} />
