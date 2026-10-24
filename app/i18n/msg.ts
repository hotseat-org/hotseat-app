/**
 * Marks text kept in data (labels in a table, a constant) as translatable, so
 * `i18n:check` finds it — it's translated where it's shown, with `t(label)`.
 */
export const msg = <T extends string>(text: T) => text
