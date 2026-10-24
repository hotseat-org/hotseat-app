/**
 * Lists the app's text missing from the Czech dictionary (and the dictionary's
 * entries nothing uses). Text is found where it's marked translatable:
 * t("…"), tn(n, "…", "…"), msg("…"), encodeNotification("…"), and errors
 * thrown with a LocalizedError subclass: new XError("…").
 *
 *   node scripts/i18n-check.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (name === "generated" || name === "node_modules") continue
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.(ts|tsx)$/.test(name) && !path.endsWith("i18n/cs.ts")) files.push(path)
  }
}
walk("app")
const sources = files.map((f) => [f, readFileSync(f, "utf8")])

const STRING = String.raw`("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\.|[^\x60\\$])*\x60)`
const unquote = (s) => JSON.parse(`"${s.slice(1, -1).replace(/\\'/g, "'").replace(/\\`/g, "`").replace(/"/g, '\\"').replace(/\\\\"/g, '\\"')}"`)

const errorClasses = new Set()
for (const [, src] of sources)
  for (const m of src.matchAll(/class (\w+) extends LocalizedError/g)) errorClasses.add(m[1])
errorClasses.add("LocalizedError")

const used = new Map() // key → first file
const add = (key, file) => used.has(key) || used.set(key, file)
// `t(` also as a method (`translator.t(`, `d.i18n.t(`); the count of a `tn(` may span lines.
const single = new RegExp(String.raw`(?<![\w$])(?:t|msg|encodeNotification)\(\s*${STRING}`, "g")
const plural = new RegExp(String.raw`(?<![\w$])tn\([\s\S]*?,\s*${STRING}\s*,\s*${STRING}`, "g")
const thrown = new RegExp(String.raw`new (${[...errorClasses].join("|")})\(\s*${STRING}`, "g")
const superCall = new RegExp(String.raw`super\(\s*${STRING}`, "g")
for (const [file, src] of sources) {
  for (const m of src.matchAll(single)) add(unquote(m[1]), file)
  for (const m of src.matchAll(plural)) add(unquote(m[1]), file)
  for (const m of src.matchAll(thrown)) add(unquote(m[2]), file)
  // An error class's own message.
  if (/extends LocalizedError/.test(src)) for (const m of src.matchAll(superCall)) add(unquote(m[1]), file)
}

const csSource = readFileSync("app/i18n/cs.ts", "utf8")
const csKeys = new Set()
// Quoted keys — and single words, which the formatter leaves unquoted.
for (const m of csSource.matchAll(new RegExp(String.raw`^\s{2}${STRING}:`, "gm"))) csKeys.add(unquote(m[1]))
for (const m of csSource.matchAll(/^\s{2}([A-Za-z_$][\w$]*):/gm)) csKeys.add(m[1])

const missing = [...used].filter(([k]) => !csKeys.has(k))
const unused = [...csKeys].filter((k) => !used.has(k))
for (const [k, f] of missing) console.log(`missing  ${JSON.stringify(k)}  (${f})`)
for (const k of unused) console.log(`unused   ${JSON.stringify(k)}`)
console.log(`\n${used.size} messages, ${missing.length} missing in cs, ${unused.length} unused`)
process.exitCode = missing.length ? 1 : 0
