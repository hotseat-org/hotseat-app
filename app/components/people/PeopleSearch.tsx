import { Avatar } from "@heroui/react"
import clsx from "clsx"
import { Check, ChevronRight, Search } from "lucide-react"
import { Fragment, useState, type ReactNode } from "react"
import { ScrollArea } from "~/components/ui/ScrollArea"
import { colorForEmail } from "~/components/office/shell-ui"
import { useI18n } from "~/i18n/I18nProvider"
import { useProgressiveList } from "~/utils/hooks/useProgressiveList"

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
  /** A dot before the label (a team's colour). */
  color?: string
  /** What it says it holds (none: how many). */
  count?: string
}

/** For searching: lower case, without accents ("Šťastná" is found by "stastna"). */
export const toSearchable = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

/**
 * A part of the list under its own heading (a team), folded or open. Someone
 * can be in several.
 */
export interface PeopleGroup<Item> {
  id: string
  isIn: (item: Item) => boolean
  /** Its heading, given who of it are found. */
  renderHeading: (found: Item[]) => ReactNode
  /** Open before anyone folds or opens it (a search opens them all). */
  isOpenAtFirst?: boolean
}

/** People a group shows at first, the rest a press away. */
const GROUP_PAGE = 60

/** Whether a person is found by `query` (already searchable): by name or email. */
export const isFound = (person: SearchedPerson, query: string) =>
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
    <Avatar.Image src={person.avatarUrl} alt="" />
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
  maxRows,
  isAutoFocused = false,
  groups,
  toolbar,
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
  /** At most this many, the rest found by searching (none: all of them, a page at a time). */
  maxRows?: number
  isAutoFocused?: boolean
  /** The list under headings (none: one list). */
  groups?: PeopleGroup<Item>[]
  /** Under the search, instead of the chips (a choice of view). */
  toolbar?: ReactNode
  className?: string
}) => {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [filterId, setFilterId] = useState(initialFilter ?? filters?.[0]?.id)
  // Groups folded or opened against how they start, and how many each shows.
  const [toggledGroups, setToggledGroups] = useState<Set<string>>(new Set())
  const [groupLimits, setGroupLimits] = useState<Record<string, number>>({})
  const filter = filters?.find((candidate) => candidate.id === filterId)
  const searchable = toSearchable(query.trim())

  const listed = items.filter(
    (item) => (!filter || filter.isIn(item)) && isFound(getPerson(item), searchable)
  )
  if (sort) listed.sort(sort)
  // A short pick (maxRows) shows that many; a whole list, a page at a time.
  const pages = useProgressiveList(listed, `${query}|${filterId}`)
  const shown = maxRows === undefined ? pages.shown : listed.slice(0, maxRows)

  const renderRow = (item: Item, key?: string) => {
    const person = getPerson(item)
    const isPicked = isSelected?.(item) ?? false
    const content = (
      <>
        {renderFace?.(item) ?? <PersonFace person={person} className="size-10 text-[15px]" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-foreground">{person.name}</span>
          <span className="block truncate text-xs text-muted">
            {renderDetail?.(item) ?? person.email}
          </span>
          {renderNote?.(item)}
        </span>
        {isPicked && <Check className="size-4 shrink-0 text-accent" strokeWidth={2.6} />}
      </>
    )

    return (
      <li key={key ?? person.email} className="flex items-center gap-2">
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
  }

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
        {toolbar}
        {!toolbar && filters && filters.length > 1 && (
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
                {candidate.color && (
                  <span
                    aria-hidden
                    className="mr-1.5 inline-block size-2 rounded-full align-middle"
                    style={{ background: candidate.color }}
                  />
                )}
                {candidate.label}{" "}
                <span className="font-semibold opacity-70">
                  {candidate.count ?? items.filter(candidate.isIn).length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ScrollArea frameClassName="-mx-1 flex-1">
        <ul className="flex flex-col gap-0.5 px-1">
          {!searchable && leading}
          {groups
            ? groups.map((group) => {
                const found = listed.filter(group.isIn)
                if (found.length === 0) return null

                const isOpen =
                  !!searchable || (group.isOpenAtFirst ?? false) !== toggledGroups.has(group.id)
                const limit = groupLimits[group.id] ?? GROUP_PAGE

                return (
                  <Fragment key={group.id}>
                    <li>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setToggledGroups((current) => {
                            const next = new Set(current)
                            if (next.has(group.id)) next.delete(group.id)
                            else next.add(group.id)

                            return next
                          })
                        }
                        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <ChevronRight
                          className={clsx(
                            "size-4 shrink-0 text-muted transition-transform",
                            isOpen && "rotate-90"
                          )}
                        />
                        {group.renderHeading(found)}
                      </button>
                    </li>
                    {isOpen &&
                      found
                        .slice(0, limit)
                        .map((item) => renderRow(item, `${group.id}:${getPerson(item).email}`))}
                    {isOpen && found.length > limit && (
                      <li>
                        <button
                          type="button"
                          onClick={() =>
                            setGroupLimits((current) => ({
                              ...current,
                              [group.id]: limit + GROUP_PAGE * 4,
                            }))
                          }
                          className="min-h-10 w-full rounded-xl text-sm font-bold text-accent hover:bg-surface-secondary"
                        >
                          {t("Show {n} more", { n: found.length - limit })}
                        </button>
                      </li>
                    )}
                  </Fragment>
                )
              })
            : shown.map((item) => renderRow(item))}
          {listed.length === 0 && (
            <li className="px-2 py-10 text-center text-sm text-muted">
              {searchable
                ? t("Nobody matches “{query}”", { query: query.trim() })
                : t("Nobody here")}
            </li>
          )}
          {/* More coming: drawn as this nears the end of the scroll. */}
          {!groups && maxRows === undefined && pages.hasMore && (
            <li ref={pages.endRef} aria-hidden className="h-12 shrink-0" />
          )}
          {maxRows !== undefined && listed.length > shown.length && (
            <li className="px-2 pt-3 text-center text-xs text-muted">
              {t("Showing {shown} of {total} — search to narrow it down", {
                shown: shown.length,
                total: listed.length,
              })}
            </li>
          )}
        </ul>
      </ScrollArea>
    </div>
  )
}
