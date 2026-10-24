import {
  createTranslator,
  translateMessage,
  type Message,
  type Params,
  type Translator,
} from "./translate"

/**
 * An error whose message is shown to the user: thrown with the English text
 * (its key) and its values, translated into the reader's language where it
 * reaches them (`translateError`).
 */
export class LocalizedError extends Error {
  readonly localized: Message
  constructor(key: string, params?: Params) {
    super(createTranslator().t(key, params))
    this.localized = { key, params }
  }
}

/** The message of an error for the user, in their language (others: `fallback`). */
export const translateError = (translator: Translator, error: unknown, fallback: string) =>
  error instanceof LocalizedError
    ? translateMessage(translator, error.localized)
    : translator.t(fallback)
