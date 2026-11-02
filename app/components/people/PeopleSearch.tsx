import { Avatar } from "@heroui/react"
import clsx from "clsx"
import { Check, Search } from "lucide-react"
import { useState, type ReactNode } from "react"
import { colorForEmail } from "~/components/office/shell-ui"
import { useI18n } from "~/i18n/I18nProvider"

/** Rows shown at most at first: a big organization is narrowed down by the search. */
const DEFAULT_MAX_ROWS = 100

/** What the search shows and searches of anyone: their email (their id), name and photo. */
export interface SearchedPerson {
  email: string
  name: string
  avatarUrl?: string
}

/** One of the chips that narrow the list (with how many it holds). */
export interface PeopleFilter<Item> {
  id: string
  label: string
  isIn: (item: Item) => boolean
}

/** For searching: lower case, without accents ("Šťastná" is found by "stastna"). */
export const toSearchable = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

/** Whether a person is found by `query` (already searchable): by name or email. */
const isFound = (person: SearchedPerson, query: string) =>
  !query || toSearchable(person.name).includes(query) || toSearchable(person.email).includes(query)

const initialsOf = (name: string) => {
  const parts = name.split(/[\s.@_-]+/).filter(Boolean)

  return (
    ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || name.slice(0, 2).toUpperCase()
  )
}

/** A person's face — their photo, or initials on their colour — round, without a ring. */
export const PersonFace = ({
  person,
  className,
}: {
  person: SearchedPerson
  /** Its size (and text size, for the initials). */
  className: string
}) => (
  <Avatar className={clsx("shrink-0 rounded-full", className)}>
    <Avatar.Image src={person.avatarUrl} />
    <Avatar.Fallback
      className="rounded-full text-[0.6em] font-extrabold text-white"
      style={{ background: colorForEmail(person.email) }}
    >
      {initialsOf(person.name || person.email)}
    </Avatar.Fallback>
  </Avatar>
)

/**
 * Finding someone in a list of people: a search by name or email (accents
 * ignored), chips to narrow it (each with its count), and a row per person —
 * their face, name and a line under it, anything beside it. Rows are picked
 * (`onPick`) or carry their own actions (`renderAside`). Used wherever
 * someone is chosen or looked up: a desk's permanent resident, a colleague
 * to sit near, who's in.
 */
export const PeopleSearch = <Item,>({
  items,
  getPerson,
  filters,
  initialFilter,
  sort,
  leading,
  renderDetail,
  renderNote,
  renderAside,
  renderFace,
  isSelected,
  onPick,
  maxRows = DEFAULT_MAX_ROWS,
  isAutoFocused = false,
  className,
}: {
  items: Item[]
  getPerson: (item: Item) => SearchedPerson
  /** Chips to narrow the list (none: no chips). */
  filters?: PeopleFilter<Item>[]
  initialFilter?: string
  /** Their order (none: as given). */
  sort?: (first: Item, second: Item) => number
  /** Rows before the people while nothing's searched (e.g. "No resident"). */
  leading?: ReactNode
  /** The line under a name (none: their email). */
  renderDetail?: (item: Item) => ReactNode
  /** Under that line (a warning). */
  renderNote?: (item: Item) => ReactNode
  /** Beside a row (its own button, a badge). */
  renderAside?: (item: Item) => ReactNode
  /** A face of its own style (none: round). */
  renderFace?: (item: Item) => ReactNode
  isSelected?: (item: Item) => boolean
  /** A row picked (none: rows aren't buttons). */
  onPick?: (item: Item) => void
  maxRows?: number
  isAutoFocused?: boolean
  className?: string
}) => {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [filterId, setFilterId] = useState(initialFilter ?? filters?.[0]?.id)
  const filter = filters?.find((candidate) => candidate.id === filterId)
  const searchable = toSearchable(query.trim())

  const listed = items.filter(
    (item) => (!filter || filter.isIn(item)) && isFound(getPerson(item), searchable)
  )
  if (sort) listed.sort(sort)
  const shown = listed.slice(0, maxRows)

  return (
    <div className={clsx("flex min-h-0 flex-col", className)}>
      <div className="flex shrink-0 flex-col gap-2.5 pb-2">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-focus">
          <Search className="size-4 shrink-0 text-muted" />
          <input
            autoFocus={isAutoFocused}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t("Search by name or email")}
            aria-label={t("Search by name or email")}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
        </label>
        {filters && filters.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("Show")}>
            {filters.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={candidate.id === filterId}
                onClick={() => setFilterId(candidate.id)}
                className={clsx(
                  "min-h-9 rounded-full border px-3 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                  candidate.id === filterId
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border text-muted hover:border-muted hover:text-foreground"
                )}
              >
                {candidate.label}{" "}
                <span className="font-semibold opacity-70">
                  {items.filter(candidate.isIn).length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ul className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
        {!searchable && leading}
        {shown.map((item) => {
          const person = getPerson(item)
          const isPicked = isSelected?.(item) ?? false
          const content = (
            <>
              {renderFace?.(item) ?? <PersonFace person={person} className="size-10 text-[15px]" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">
                  {person.name}
                </span>
                <span className="block truncate text-xs text-muted">
                  {renderDetail?.(item) ?? person.email}
                </span>
                {renderNote?.(item)}
              </span>
              {isPicked && <Check className="size-4 shrink-0 text-accent" strokeWidth={2.6} />}
            </>
          )

          return (
            <li key={person.email} className="flex items-center gap-2">
              {onPick ? (
                <button
                  type="button"
                  aria-pressed={isPicked}
                  onClick={() => onPick(item)}
                  className={clsx(
                    "flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                    isPicked ? "bg-accent/10" : "hover:bg-surface-secondary"
                  )}
                >
                  {content}
                </button>
              ) : (
                <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-1 py-1.5">
                  {content}
                </div>
              )}
              {renderAside?.(item)}
            </li>
          )
        })}
        {listed.length === 0 && (
          <li className="px-2 py-10 text-center text-sm text-muted">
            {searchable ? t("Nobody matches “{query}”", { query: query.trim() }) : t("Nobody here")}
          </li>
        )}
        {listed.length > shown.length && (
          <li className="px-2 pt-3 text-center text-xs text-muted">
            {t("Showing {shown} of {total} — search to narrow it down", {
              shown: shown.length,
              total: listed.length,
            })}
          </li>
        )}
      </ul>
    </div>
  )
}
