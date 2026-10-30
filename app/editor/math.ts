/**
 * Small number helpers for code that must stay three-free (it runs on the
 * server or in the simple view). Where three.js is imported anyway, its
 * MathUtils.clamp and MathUtils.lerp do the same.
 */

/** `value` held between `min` and `max`. */
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

/** `amount` of the way from `from` to `to` (0 = `from`, 1 = `to`). */
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount
