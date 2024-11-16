import { Avatar, Card, CardFooter } from "@nextui-org/react"
import { Link } from "@remix-run/react"
import { Edit, Trash, Users } from "lucide-react"
import { Button } from "../Button"

interface Props {
  src?: string
  editTo: string
  deleteTo: string
}

export const InputAvatar = ({ src, editTo, deleteTo }: Props) => {
  return (
    <div className="flex md:flex-col">
      <div className="relative">
        <Avatar fallback={<Users size={72} />} className="w-52 h-52 z-0" src={src} isBordered />
        <Card
          isBlurred
          className="absolute top-[95%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-1 border-1 dark:border-slate-800/60"
        >
          <CardFooter className="gap-2 p-1">
            <Button
              isDisabled={!src}
              as={Link}
              to={deleteTo}
              replace
              variant="light"
              isIconOnly
              color="danger"
              size="sm"
            >
              <Trash size="18" />
            </Button>
            <Button as={Link} replace to={editTo} variant="flat" size="sm">
              <Edit size="18" /> Edit
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
