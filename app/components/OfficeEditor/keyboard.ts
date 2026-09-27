/** True when a key event comes from a text field, so editor shortcuts must ignore it. */
export const isTypingTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el) return false
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  )
}
