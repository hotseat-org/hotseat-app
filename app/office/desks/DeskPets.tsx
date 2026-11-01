import { Suspense, useContext, useEffect, useId, useMemo, useState } from "react"
import type { ThreeEvent } from "@react-three/fiber"
import { useDesksOnDay } from "../booking/useBooking"
import { useOfficeStore } from "../store"
import { useHoveredPieceActions } from "./useHoveredPiece"
import { personByEmail, usePeople } from "./people"
import { spotFor, type Spot } from "./seatSpot"
import { petFor } from "~/editor/core"
import { WiggleModel } from "~/editor/kit"
import { CursorHintContext } from "~/editor"

const PET_SCALE = 0.4

/**
 * View mode: a pet sits at every desk that's taken on the shown day — the
 * booker's (or permanent resident's) pet. Clicking it opens the desk's card,
 * like clicking the desk.
 */
export const DeskPets = () => {
  const { floorDesks: desks } = useDesksOnDay()
  const objects = useOfficeStore((state) => state.objects)
  const openSeatCard = useOfficeStore((state) => state.openSeatCard)
  const { setHoveredPiece, clearHoveredPiece } = useHoveredPieceActions("deskmate")
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
        <Pet
          key={desk.id}
          url={pet.url}
          spot={spot}
          onClick={() => openSeatCard(desk.id)}
          // Pointed at, its desk shows it's pointed at too (its plinth).
          onHover={(isOver) => (isOver ? setHoveredPiece(desk.id) : clearHoveredPiece(desk.id))}
        />
      ))}
    </>
  )
}

const Pet = ({
  url,
  spot,
  onClick,
  onHover,
}: {
  url: string
  spot: Spot
  onClick: () => void
  onHover: (isOver: boolean) => void
}) => {
  const [hovered, setHovered] = useState(false)
  // The scene's own hand, as over its desk.
  const setCursorHint = useContext(CursorHintContext)
  const id = useId()
  useEffect(() => {
    if (!hovered) return

    setCursorHint(id, "point")

    return () => setCursorHint(id, null)
  }, [hovered, id, setCursorHint])

  return (
    <group
      position={[spot.x, spot.y, spot.z]}
      rotation={[0, spot.rotation, 0]}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        onHover(true)
      }}
      onPointerOut={() => {
        setHovered(false)
        onHover(false)
      }}
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
