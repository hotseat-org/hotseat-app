/**
 * Picks one of `n` looks from a piece's variant number (see `variantOf`), so
 * copies of the same furniture don't all look identical.
 */
export const look = (variant: number | undefined, n: number) => (variant ?? 0) % n
