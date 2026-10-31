import { cs } from "./cs"
import { registerMessages } from "./translate"

// The server speaks every language from the start (a page, an email or a
// notification may be in any); the browser loads only its reader's.
registerMessages("cs", cs)
