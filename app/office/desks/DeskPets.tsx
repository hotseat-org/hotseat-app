import { Suspense, useMemo, useState } from "react"
import { useCursor } from "@react-three/drei"
import type { ThreeEvent } from "@react-three/fiber"
import { useDesksOnDay } from "../booking/useBooking"
import { personByEmail, usePeople } from "./people"
import { spotFor, type Spot } from "./seatSpot"
import { useEditorStore } from "~/editor"
import { petFor } from "~/editor/core"
import { WiggleModel } from "~/editor/kit"

const PET_SCALE = 0.4

/**
 * View mode: a pet sits at every desk that's taken on the shown day — the
 * booker's (or permanent resident's) pet. Clicking it opens the desk's card,
 * like clicking the desk.
 */
export const DeskPets = () => {
  const { desks } = useDesksOnDay()
  const objects = useEditorStore((state) => state.objects)
  const openSeatCard = useEditorStore((state) => state.openSeatCard)
  const people = usePeople()
  const pets = useMemo(() => {
    const seats = objects.filter((object) => object.type === "seat")

    return desks
      .filter((desk) => desk.state.kind !== "free")
      .map((desk) => {
        const email = desk.state.kind === "free" ? "" : desk.state.email

        return {
          desk: desk.desk,
          // Their own pick (settings → Desk pet), else one derived from the email.
          pet: petFor(email, personByEmail(people, email)?.pet),
          spot: spotFor(desk.desk, seats),
        }
      })
  }, [desks, objects, people])

  return (
    <>
      {pets.map(({ desk, pet, spot }) => (
        <Pet key={desk.id} url={pet.url} spot={spot} onClick={() => openSeatCard(desk.id)} />
      ))}
    </>
  )
}

const Pet = ({ url, spot, onClick }: { url: string; spot: Spot; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  return (
    <group
      position={[spot.x, spot.y, spot.z]}
      rotation={[0, spot.rotation, 0]}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (event.delta > 4) return // a camera drag, not a click

        event.stopPropagation()
        onClick()
      }}
    >
      <Suspense fallback={null}>
        <WiggleModel url={url} scale={PET_SCALE} />
      </Suspense>
    </group>
  )
}
