// Exclude keys from user
export function exclude<O extends Record<string, unknown>, Key extends keyof O>(
  object: O,
  ...keys: Key[]
): Omit<O, Key> {
  for (const key of keys) {
    delete object[key]
  }
  return object
}
