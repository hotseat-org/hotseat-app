/**
 * Colour schemes a person can pick (Settings › Appearance), each with a light
 * and a dark half. "warm" is the default theme in tailwind.css; the others are
 * token blocks there keyed by `data-scheme` on <html>. These swatches only
 * preview them in the picker — keep both in step.
 */
export interface SchemeHalf {
  background: string
  surface: string
  border: string
  accent: string
}

export interface Scheme {
  id: SchemeId
  name: string
  description: string
  light: SchemeHalf
  dark: SchemeHalf
}

export const SCHEME_IDS = ["warm", "sage", "terracotta", "ocean", "plum"] as const
export type SchemeId = (typeof SCHEME_IDS)[number]

export const DEFAULT_SCHEME: SchemeId = "warm"

export const isSchemeId = (value: unknown): value is SchemeId =>
  typeof value === "string" && (SCHEME_IDS as readonly string[]).includes(value)

export const SCHEMES: Scheme[] = [
  {
    id: "warm",
    name: "Warm office",
    description: "Cream & denim",
    light: { background: "#f1e9db", surface: "#fbf6ee", border: "#e2d6c4", accent: "#4a6fae" },
    dark: { background: "#151820", surface: "#2a303c", border: "#3a4150", accent: "#8fb3f0" },
  },
  {
    id: "sage",
    name: "Sage",
    description: "Linen & leaf",
    light: { background: "#ecefe6", surface: "#f8faf4", border: "#d5dccb", accent: "#4f7a5a" },
    dark: { background: "#121612", surface: "#232b24", border: "#36423a", accent: "#8cc29a" },
  },
  {
    id: "terracotta",
    name: "Terracotta",
    description: "Clay & sand",
    light: { background: "#f5ebe3", surface: "#fdf7f2", border: "#ead6c8", accent: "#b5583a" },
    dark: { background: "#1a1311", surface: "#2e221d", border: "#47352d", accent: "#e88d6c" },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Mist & harbour blue",
    light: { background: "#eaf0f4", surface: "#f8fbfd", border: "#d3dde6", accent: "#2f6f9f" },
    dark: { background: "#0e151d", surface: "#1b2633", border: "#2d3c4c", accent: "#6fb2e6" },
  },
  {
    id: "plum",
    name: "Plum",
    description: "Rose grey & plum",
    light: { background: "#f2ecf1", surface: "#fcf8fb", border: "#e3d5e0", accent: "#7a4f8a" },
    dark: { background: "#161117", surface: "#28202a", border: "#3e3241", accent: "#c497d6" },
  },
]
