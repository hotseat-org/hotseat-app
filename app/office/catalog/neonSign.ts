import { z } from "zod"
import { msg } from "~/i18n/msg"

/**
 * The neon sign's half the server needs, without three.js: what it says
 * (kept on its piece) and the colours its tubes come in.
 */

/** The longest text a sign takes (characters). */
export const MAX_SIGN_TEXT = 32

/** What a sign says until someone writes on it. */
export const DEFAULT_SIGN_TEXT = "hello"

/** The tubes' colours, each with its name. */
export const NEON_TUBES = [
  { color: "#ff4f9a", name: msg("Pink") },
  { color: "#ffb347", name: msg("Amber") },
  { color: "#3fd0ff", name: msg("Cyan") },
  { color: "#9dff5c", name: msg("Lime") },
  { color: "#b57bff", name: msg("Violet") },
  { color: "#fff1d6", name: msg("Warm white") },
]

/** A new sign's colour. */
export const DEFAULT_NEON_COLOR = NEON_TUBES[0].color

/** What a sign keeps on its piece, as the server checks it before saving. */
export const SIGN_FIELDS = {
  signText: z.string().max(MAX_SIGN_TEXT).optional(),
}
