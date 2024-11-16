import {
  Avatar,
  AvatarGroup,
  Card,
  CardFooter,
  CardHeader,
  Divider,
  Tooltip,
  User,
} from "@nextui-org/react"
import { Role } from "@prisma/client"
import { Users } from "lucide-react"
import { ReactNode } from "react"
import { OrganizationWithMembers } from "~/core/organization/types"

interface Props {
  organization: OrganizationWithMembers
  children?: ReactNode
}

export const OrganizationPreviewCard = ({
  organization: { slug, thumbnailUrl, name, members },
  children,
}: Props) => {
  return (
    <Card key={slug} className="w-full sm:w-72">
      <CardHeader>
        <User
          avatarProps={{
            showFallback: true,
            fallback: <Users />,
            src: thumbnailUrl,
          }}
          name={name}
          description={slug}
        />
      </CardHeader>
      <Divider />
      <CardFooter>
        <div className="flex justify-between w-full">
          <AvatarGroup
            size="sm"
            className="pl-4"
            max={4}
            total={members.totalCount - members.data.length}
          >
            {members.data.map((member) => (
              <Tooltip
                key={member.userEmail}
                content={`${member.displayName}${member.role === Role.ADMIN ? " (Admin)" : ""}`}
              >
                <Avatar
                  isBordered
                  color={member.role === Role.ADMIN ? "primary" : "default"}
                  src={member.avatarUrl}
                />
              </Tooltip>
            ))}
          </AvatarGroup>
          {children}
        </div>
      </CardFooter>
    </Card>
  )
}
