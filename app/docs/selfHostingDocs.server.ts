import { Marked, type Tokens } from "marked"

/**
 * The self-hosting guide online (/docs/self-hosting/…): the very Markdown in
 * docs/self-hosting (read when the app is built), rendered on the server.
 * Links between its pages ("installation.md#…") become the site's, and
 * headings get the ids GitHub gives them, so the same anchors work in both.
 */
const FILES = import.meta.glob("../../docs/self-hosting/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>

/** The guide's pages, in reading order: their file, and their path ("" is the overview). */
const ORDER = [
  { file: "README.md", slug: "" },
  { file: "installation.md", slug: "installation" },
  { file: "configuration.md", slug: "configuration" },
  { file: "sign-in.md", slug: "sign-in" },
  { file: "administration.md", slug: "administration" },
  { file: "operations.md", slug: "operations" },
]

const SLUG_BY_FILE = Object.fromEntries(ORDER.map(({ file, slug }) => [file, slug]))

/** Where a page is on the site. */
const getPagePath = (slug: string) =>
  `${import.meta.env.BASE_URL}docs/self-hosting${slug ? `/${slug}` : ""}`

/** A heading's id, as GitHub makes it ("4. HTTPS with a reverse proxy" → "4-https-with-a-reverse-proxy"). */
const getHeadingId = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/ /g, "-")

/** "installation.md#first-run" → the site's path for it; other links as they are. */
const rewriteLink = (href: string) => {
  const [file, anchor] = href.split("#")
  if (!file) return href
  if (!(file in SLUG_BY_FILE)) return href

  return `${getPagePath(SLUG_BY_FILE[file])}${anchor ? `#${anchor}` : ""}`
}

/** ` name="value"`, for a tag being written. */
const getAttribute = (name: string, value: string) => ` ${name}="${value}"`

export interface DocsHeading {
  id: string
  text: string
}

const render = (markdown: string) => {
  const headings: DocsHeading[] = []
  const marked = new Marked({
    renderer: {
      heading({ tokens, depth, text }: Tokens.Heading) {
        const id = getHeadingId(text)
        if (depth === 2) headings.push({ id, text: text.replace(/[`*]/g, "") })

        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`
      },
      link({ href, title, tokens }: Tokens.Link) {
        const target = rewriteLink(href)
        // Other sites open apart.
        const isExternal = /^https?:\/\//.test(target)
        const attributes = [
          getAttribute("href", target),
          title ? getAttribute("title", title) : "",
          isExternal
            ? getAttribute("target", "_blank") + getAttribute("rel", "noopener noreferrer")
            : "",
        ].join("")

        return `<a${attributes}>${this.parser.parseInline(tokens)}</a>`
      },
    },
  })
  const html = marked.parse(markdown, { async: false })

  return { html, headings }
}

/** Every page: its path, title (its first heading), HTML and its sections. */
const PAGES = ORDER.flatMap(({ file, slug }) => {
  const markdown = Object.entries(FILES).find(([path]) => path.endsWith(`/${file}`))?.[1]
  if (!markdown) return []

  const title = markdown.match(/^# (.+)$/m)?.[1] ?? slug

  return [{ slug, title, path: getPagePath(slug), ...render(markdown) }]
})

/** The guide's pages, for its menu. */
export const getDocsPages = () => PAGES.map(({ slug, title, path }) => ({ slug, title, path }))

/** One page of the guide, or undefined. */
export const getDocsPage = (slug = "") => PAGES.find((page) => page.slug === slug)
