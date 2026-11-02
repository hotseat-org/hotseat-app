import clsx from "clsx"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Link, useLoaderData, type LoaderFunctionArgs, type MetaFunction } from "react-router"
import { ProductFooter, ProductHeader } from "~/components/product/ProductPage"
import { getDocsPage, getDocsPages } from "~/docs/selfHostingDocs.server"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * The self-hosting guide on the site (/docs/self-hosting/…), in the product
 * page's clothes: its pages on the side, the page itself (docs/self-hosting
 * in the repository, rendered on the server), and the next one to read.
 */
export const loader = ({ params }: LoaderFunctionArgs) => {
  const page = getDocsPage(params.page ?? "")
  if (!page) throw new Response(null, { status: 404 })

  const pages = getDocsPages()
  const index = pages.findIndex((entry) => entry.slug === page.slug)

  return {
    pages,
    page: { slug: page.slug, title: page.title, html: page.html, headings: page.headings },
    previous: pages[index - 1] ?? null,
    next: pages[index + 1] ?? null,
  }
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.page.title} · Hotseat` : "Hotseat" },
  {
    name: "description",
    content: "Run Hotseat on your own server: Docker, your own database and your own sign-in.",
  },
]

const DocsPage = () => {
  const { pages, page, previous, next } = useLoaderData<typeof loader>()
  const { t } = useI18n()

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ProductHeader />

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:pt-12">
        <nav aria-label={t("Self-hosting guide")} className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-extrabold tracking-[0.08em] text-accent uppercase">
            {t("Self-hosting guide")}
          </p>
          {/* Phones: the pages in a row to swipe; wider: a list. */}
          <ul className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
            {pages.map((entry) => {
              const isCurrent = entry.slug === page.slug

              return (
                <li key={entry.slug} className="shrink-0">
                  <Link
                    to={`/docs/self-hosting${entry.slug ? `/${entry.slug}` : ""}`}
                    prefetch="intent"
                    aria-current={isCurrent ? "page" : undefined}
                    className={clsx(
                      "block rounded-full px-3.5 py-2 text-sm font-bold transition-colors lg:rounded-xl",
                      isCurrent
                        ? "bg-accent/12 text-accent"
                        : "text-muted hover:bg-surface-secondary hover:text-foreground"
                    )}
                  >
                    {entry.slug ? entry.title : t("Overview")}
                  </Link>
                </li>
              )
            })}
          </ul>

          {page.headings.length > 1 && (
            <div className="mt-8 hidden lg:block">
              <p className="px-3.5 text-xs font-extrabold tracking-[0.08em] text-muted uppercase">
                {t("On this page")}
              </p>
              <ul className="mt-2 flex flex-col gap-0.5">
                {page.headings.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      className="block rounded-xl px-3.5 py-1.5 text-sm text-muted hover:text-foreground"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <main className="min-w-0">
          <article
            className="docs-prose"
            // Our own Markdown (docs/self-hosting), rendered on the server.
            dangerouslySetInnerHTML={{ __html: page.html }}
          />

          <div className="mt-14 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
            {previous ? (
              <PageLink
                to={previous.slug}
                label={t("Previous")}
                title={previous.slug ? previous.title : t("Overview")}
                isPrevious
              />
            ) : (
              <span />
            )}
            {next && <PageLink to={next.slug} label={t("Next")} title={next.title} />}
          </div>
        </main>
      </div>

      <ProductFooter />
    </div>
  )
}

/** The page before or after, at the end of this one. */
const PageLink = ({
  to,
  label,
  title,
  isPrevious = false,
}: {
  to: string
  label: string
  title: string
  isPrevious?: boolean
}) => (
  <Link
    to={`/docs/self-hosting${to ? `/${to}` : ""}`}
    prefetch="intent"
    className={clsx(
      "group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent/50",
      isPrevious ? "sm:col-start-1" : "text-right sm:col-start-2 sm:flex-row-reverse"
    )}
  >
    {isPrevious ? (
      <ArrowLeft className="size-5 shrink-0 text-muted group-hover:text-accent" />
    ) : (
      <ArrowRight className="size-5 shrink-0 text-muted group-hover:text-accent" />
    )}
    <span className={clsx("min-w-0 flex-1", !isPrevious && "sm:text-right")}>
      <span className="block text-xs font-bold text-muted">{label}</span>
      <span className="block truncate font-extrabold">{title}</span>
    </span>
  </Link>
)

export default DocsPage
