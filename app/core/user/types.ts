export interface User {
  email: string
  displayName?: string
  photo?: string
  /** Desk pet model id; unset = derived from the email. */
  pet?: string
}
