import { createContext, useContext } from "react"

/** An org member as the editor needs them (seat assignment, name tags). */
export interface Person {
  /** Stable id — stored as a seat's `assignee`. */
  email: string
  name: string
  avatarUrl?: string
}

export interface People {
  me: Person | null
  members: Person[]
}

/** Provided by OfficeEditor (and re-provided inside the Canvas). Empty standalone. */
export const PeopleContext = createContext<People>({ me: null, members: [] })

export const usePeople = () => useContext(PeopleContext)

export const personByEmail = (people: People, email?: string) =>
  email ? (people.members.find((p) => p.email === email) ?? null) : null

export const initials = (name: string) => {
  const parts = name.split(/[\s.@_-]+/).filter(Boolean)
  return (
    ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || name.slice(0, 2).toUpperCase()
  )
}
