import { Button, ButtonProps } from "@heroui/react"
import { NavigateOptions, To, useNavigate } from "react-router"

export type ButtonLinkProps = ButtonProps & {
  navigateOptions?: NavigateOptions
  to: To
  replace?: boolean
}

export const ButtonLink = ({
  children,
  onClick,
  to,
  replace,
  navigateOptions = { replace },
  ...restProps
}: ButtonLinkProps) => {
  const navigate = useNavigate()

  return (
    <Button
      onClick={(event) => {
        onClick?.(event)
        navigate(to, navigateOptions)
      }}
      {...restProps}
    >
      {children}
    </Button>
  )
}
