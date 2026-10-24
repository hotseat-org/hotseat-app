import {
  createTranslator,
  translateMessage,
  type Message,
  type Params,
  type Translator,
} from "./translate"

/**
 * Notifications are stored as text, but read later — in the reader's language,
 * whatever it is by then. So the stored text is the message's key and values
 * (JSON); older notifications are plain English and show as they are.
 */
export const encodeNotification = (key: string, params?: Params) =>
  JSON.stringify({ key, params } satisfies Message)

export const readNotification = (translator: Translator, stored: string) => {
  if (stored.startsWith("{")) {
    try {
      const message = JSON.parse(stored) as Message
      if (typeof message.key === "string") return translateMessage(translator, message)
    } catch {
      // Not ours: plain text.
    }
  }
  return stored
}

/** The English text of a notification (logs, fallbacks). */
export const notificationText = (stored: string) => readNotification(createTranslator(), stored)
