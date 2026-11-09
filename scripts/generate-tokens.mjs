/**
 * The design system's tokens as CSS: design/tokens.json (and the colour schemes
 * in design/schemes.json) → app/styles/tokens.generated.css. Roles and base
 * colours per theme, the schemes' overrides, the other scales, and Tailwind's
 * colour names for the roles. `--check` fails when the file is out of date.
 */
import { readFileSync, writeFileSync } from "node:fs"

const OUT = "app/styles/tokens.generated.css"
const tokens = JSON.parse(readFileSync("design/tokens.json", "utf8"))
const schemes = JSON.parse(readFileSync("design/schemes.json", "utf8"))
const [light, dark] = tokens.color.themes.map((theme) => theme.id)

/** A value as CSS: an alias "{name}" is that token's variable. */
const toCss = (value) => String(value).replace(/^\{(.+)\}$/, "var(--$1)")
const valueIn = (token, theme) => (typeof token.value === "string" ? token.value : (token.value[theme] ?? token.value[light]))
const declare = (list, theme) => list.map((token) => `  --${token.name}: ${toCss(valueIn(token, theme))};`).join("\n")

// Roles are the colour tokens components use: everything but the base steps.
const isBase = (name) => /-(\d{2,3})$/.test(name) || ["ground-day", "ground-dusk", "page-cream", "page-night", "white"].includes(name)
const colours = tokens.color.tokens
const roles = colours.filter((token) => !isBase(token.name))
const scales = Object.entries(tokens)
  .filter(([family, value]) => value && Array.isArray(value.tokens) && !["color", "shadow"].includes(family))
  .flatMap(([, value]) => value.tokens)

const schemeBlocks = Object.entries(schemes.schemes)
  .slice(1)
  .map(([id, scheme]) => {
    const block = (themeIndex) =>
      Object.entries(schemes.roles)
        .map(([role, steps]) => `  --${role}: var(--${scheme.base}-${steps[themeIndex]});`)
        .concat(`  --surface-raised: ${scheme["surface-raised"][themeIndex]};`)
        .join("\n")

    return `:root[data-scheme="${id}"] {\n${block(0)}\n}\n:root[data-scheme="${id}"].dark,\n:root[data-scheme="${id}"][data-theme="dark"] {\n${block(1)}\n}`
  })
  .join("\n\n")

const css = `/* Generated from design/tokens.json by scripts/generate-tokens.mjs — don't edit. */

:root {
${declare(colours, light)}
${declare(tokens.shadow.tokens, light)}
${scales.map((token) => `  --${token.name}: ${token.value};`).join("\n")}
}

.dark,
[data-theme="dark"] {
${declare(colours, dark)}
${declare(tokens.shadow.tokens, dark)}
}

${schemeBlocks}

/* The roles as Tailwind colours: bg-surface-raised, text-text-muted, bg-action-primary… */
@theme inline {
${roles.map((token) => `  --color-${token.name}: var(--${token.name});`).join("\n")}
}
`

if (process.argv.includes("--check")) {
  const current = readFileSync(OUT, "utf8")
  if (current !== css) {
    console.error(`${OUT} is out of date: run bun run tokens`)
    process.exit(1)
  }
  console.log(`${OUT} is up to date`)
} else {
  writeFileSync(OUT, css)
  console.log(`wrote ${OUT}: ${colours.length} colours, ${scales.length} other tokens, ${Object.keys(schemes.schemes).length} schemes`)
}
