import type { ButtonProps } from "@heroui/react"
import { Button as NUIButton } from "@heroui/react"

interface Props extends ButtonProps {
  to?: string
  replace?: boolean
}

export const Button = (props: Props) => <NUIButton {...props} />
