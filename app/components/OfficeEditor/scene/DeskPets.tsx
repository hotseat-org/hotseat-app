import { Suspense, useMemo, useState } from "react"
import { useCursor } from "@react-three/drei"
import type { ThreeEvent } from "@react-three/fiber"
import { useEditorStore } from "../store"
import { useDesksOnDay } from "../useBooking"
import { petFor } from "../models"
import { WiggleModel } from "../objects/WiggleModel"
import { spotFor, type Spot } from "../seatSpot"

const PET_SCALE = 0.4

/**
 * View mode: a pet sits at every desk that's taken on the shown day — the
 * booker's (or permanent resident's) pet. Clicking it opens the desk's card,
 * like clicking the desk.
 */
export const DeskPets = () => {
  const { desks } = useDesksOnDay()
  const objects = useEditorStore((s) => s.objects)
  const openSeatCard = useEditorStore((s) => s.openSeatCard)
  const pets = useMemo(() => {
    const seats = objects.filter((o) => o.type === "seat")
    return desks
      .filter((d) => d.state.kind !== "free")
      .map((d) => ({
        desk: d.desk,
        pet: petFor(d.state.kind === "free" ? "" : d.state.email),
        spot: spotFor(d.desk, seats),
      }))
  }, [desks, objects])

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
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 4) return // a camera drag, not a click
        e.stopPropagation()
        onClick()
      }}
    >
      <Suspense fallback={null}>
        <WiggleModel url={url} scale={PET_SCALE} />
      </Suspense>
    </group>
  )
}
