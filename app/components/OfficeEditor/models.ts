/**
 * Registry of external GLB models (Kenney-style animal pack in public/models/).
 * These are LOADED and available, but intentionally NOT exposed in the toolbar —
 * the user cannot place them. They're reserved for programmatic/decor use.
 *
 * Each GLB has its origin at the base (sits on the floor) and shares
 * public/models/Textures/colormap.png. Footprint/scale are starting defaults to
 * tune if/when these are actually shown.
 */
export interface ModelDef {
  /** Stable id. */
  id: string
  /** Human label. */
  label: string
  /** Served URL. */
  url: string
  /** Footprint in grid squares [x, z]. */
  footprint: [number, number]
  /** Uniform scale applied to the loaded model. */
  scale?: number
  /** Vertical offset so the model sits on the floor. */
  yOffset?: number
  /** Base facing offset in radians. */
  rotationOffset?: number
}

const ANIMALS = [
  "beaver",
  "bee",
  "bunny",
  "cat",
  "caterpillar",
  "chick",
  "cow",
  "crab",
  "deer",
  "dog",
  "elephant",
  "fish",
  "fox",
  "giraffe",
  "hog",
  "koala",
  "lion",
  "monkey",
  "panda",
  "parrot",
  "penguin",
  "pig",
  "polar",
  "tiger",
] as const

const LABELS: Record<string, string> = { polar: "Polar Bear" }

export const MODELS: ModelDef[] = ANIMALS.map((name) => ({
  id: name,
  label: LABELS[name] ?? name[0].toUpperCase() + name.slice(1),
  url: `/models/animal-${name}.glb`,
  footprint: [2, 2],
  scale: 0.5,
  yOffset: 0,
  rotationOffset: 0,
}))

/** A pet's picture for 2D UI (the settings picker): rendered from its GLB. */
export const petThumb = (id: string) => `/pets/${id}.png`

export const modelById = (id: string): ModelDef | undefined => MODELS.find((m) => m.id === id)

/** A random model id (used when placing a deskmate). */
export const randomModelId = (): string => MODELS[Math.floor(Math.random() * MODELS.length)].id

/**
 * The pet that stands in for a person at their desk: `chosen` (their pick in
 * settings → Desk pet, `User.pet`) when set, else a stable one derived from
 * their email.
 */
export const petFor = (email: string, chosen?: string): ModelDef => {
  const own = chosen ? modelById(chosen) : undefined
  if (own) return own
  let h = 0
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0
  return MODELS[h % MODELS.length]
}
