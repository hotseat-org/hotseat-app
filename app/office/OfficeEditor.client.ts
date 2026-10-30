// The editor only renders in the browser (behind `ClientOnly`). Importing it
// through a `.client` module keeps three.js out of the Worker bundle.
export { default } from "./OfficeEditor"
