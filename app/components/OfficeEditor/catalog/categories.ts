import type { ReactNode } from "react"
import type { CatalogItem } from "../types"
import { getTiles } from "./renderers"

/** A Sims-style build category grouping related kinds. */
export interface CategoryDefinition {
  id: string
  /** Its name, translatable (msg). */
  label: string
  /** The rail icon: a little illustration of the category's most recognisable piece. */
  icon: (props: { className?: string }) => ReactNode
  /** A line under the title: what to know before placing these. */
  hint?: string
  /** Tools offered first that place no single piece (the Room tool). */
  leadingTools?: CatalogItem[]
}

export interface Category extends CategoryDefinition {
  /** What it offers: its leading tools, then the kinds registered into it, in order. */
  types: CatalogItem[]
}

const categories: CategoryDefinition[] = []

/** Add categories to the catalogue, after those already there. */
export const registerCategories = (definitions: CategoryDefinition[]) => {
  categories.push(...definitions)
}

/** The catalogue's categories with what each offers. */
export const getCategories = (): Category[] => {
  const tiles = getTiles()
  return categories.map((category) => ({
    ...category,
    types: [
      ...(category.leadingTools ?? []),
      ...tiles.filter((tile) => tile.category === category.id).map((tile) => tile.type),
    ],
  }))
}
