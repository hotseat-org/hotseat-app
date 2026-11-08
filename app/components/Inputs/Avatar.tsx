import { Avatar, AvatarFallback, Card } from "@heroui/react"
import { Edit, Trash, Users } from "lucide-react"
import { Button } from "../Button"

interface Props {
  src?: string
  onEdit: () => void
  onDelete: () => void
}

export const InputAvatar = ({ src, onEdit, onDelete }: Props) => {
  return (
    <div className="relative w-fit">
      <Avatar className="w-52 h-52 z-0">
        <Avatar.Image src={src} alt="" />
        <AvatarFallback>
          <Users size={72} />
        </AvatarFallback>
      </Avatar>
      <Card className="bg-background-secondary/60 absolute top-[90%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-1 border dark:border-slate-800/30">
        <div className="gap-2 p-1 flex">
          <Button onPress={onDelete} isIconOnly size="sm" variant="secondary">
            <Trash size="18" />
          </Button>
          <Button onPress={onEdit} size="sm" variant="secondary">
            <Edit size="18" /> Edit
          </Button>
        </div>
      </Card>
    </div>
  )
}
