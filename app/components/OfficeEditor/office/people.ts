import { useEditorStore } from "../store"

/** An org member as the editor needs them (seat assignment, name tags). */
export interface Person {
  /** Stable id — stored as a seat's `assignee`. */
  email: string
  name: string
  avatarUrl?: string
  /** Their chosen desk pet (a model id); unset = derived from the email. */
  pet?: string
}

export interface People {
  me: Person | null
  members: Person[]
}

/** The organization's members, from the office's store (see OfficeSync). Empty standalone. */
export const usePeople = () => useEditorStore((state) => state.people)

export const personByEmail = (people: People, email?: string) =>
  email ? (people.members.find((member) => member.email === email) ?? null) : null

export const initials = (name: string) => {
  const parts = name.split(/[\s.@_-]+/).filter(Boolean)
  return (
    ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || name.slice(0, 2).toUpperCase()
  )
}
