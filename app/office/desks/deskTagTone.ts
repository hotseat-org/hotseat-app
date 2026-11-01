/** The border, fill and text colours of a desk's name tag: yours, a free desk's, or anyone else's. */
export const getDeskTagTone = (isMine: boolean, isFree: boolean) => {
  if (isMine) return "border-accent bg-accent text-accent-foreground"
  if (isFree) return "border-success bg-success text-success-foreground"

  // A border that shows on a light floor too (the theme's barely did).
  return "border-foreground/20 bg-overlay text-foreground"
}
