import { Popover } from "@heroui/react"
import { Armchair, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { MemberAvatar, PANEL, PANEL_HOVER, nameOf, type ShellMember } from "./shell-ui"
import { useOfficeStore } from "~/office/store"
import { isSeatable } from "~/office/catalog"
import { useI18n } from "~/i18n/I18nProvider"
import { useAllPieces } from "~/editor"
import type { SceneObject } from "~/editor/core"
import { useDeskFloor } from "~/office/booking/useBooking"

interface Result {
  key: string
  title: string
  subtitle: string
  /** The desk to open (a person without a desk has none). */
  deskId?: string
  member?: ShellMember
}

/**
 * "Find a person or seat" (⌘K): search members and desk labels in this office.
 * Picking a desk — or a person who has one — opens that desk's card in the
 * scene (the same card as clicking the desk).
 */
export const ShellSearch = ({ members }: { members: ShellMember[] }) => {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const objects = useAllPieces()
  const getDeskFloor = useDeskFloor()
  const openSeatCard = useOfficeStore((s) => s.openSeatCard)

  // ⌘K / Ctrl+K toggles it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    const desks = objects.filter((o) => isSeatable(o.type))
    // "Desk B2", with its floor in an office with floors: "Desk B2 · Attic".
    const withFloor = (text: string, desk: SceneObject) => {
      const floor = getDeskFloor(desk)

      return floor ? `${text} · ${floor}` : text
    }
    const people: Result[] = members.map((m) => {
      const desk = desks.find((d) => d.assignee === m.userEmail)
      return {
        key: `p:${m.userEmail}`,
        title: nameOf(m),
        subtitle: desk
          ? withFloor(
              desk.label ? t("Desk {label}", { label: desk.label }) : t("Desk assigned"),
              desk
            )
          : t("No desk in this office"),
        deskId: desk?.id,
        member: m,
      }
    })
    const seats: Result[] = desks
      .filter((d) => d.label)
      .map((d) => {
        const who = members.find((m) => m.userEmail === d.assignee)
        return {
          key: `d:${d.id}`,
          title: withFloor(t("Desk {label}", { label: d.label ?? "" }), d),
          subtitle: who ? nameOf(who) : t("Free"),
          deskId: d.id,
        }
      })
    const all = [...people, ...seats]
    if (!q) return all.slice(0, 8)
    return all
      .filter((r) =>
        `${r.title} ${r.subtitle} ${r.member?.userEmail ?? ""}`.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [query, objects, members, t, getDeskFloor])

  const pick = (r: Result) => {
    if (!r.deskId) return
    openSeatCard(r.deskId)
    setOpen(false)
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <div
          role="button"
          tabIndex={0}
          aria-label={t("Find a person or seat (⌘K)")}
          className={`${PANEL} ${PANEL_HOVER} flex h-11 cursor-pointer items-center gap-2 px-3.5 text-sm text-muted outline-none focus-visible:ring-2 focus-visible:ring-focus`}
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">{t("Find a person or seat…")}</span>
          <kbd className="ml-1 hidden rounded border border-border px-1.5 text-[0.65rem] sm:inline">
            ⌘K
          </kbd>
        </div>
      </Popover.Trigger>
      <Popover.Content placement="bottom end" className="rounded-xl">
        <Popover.Dialog className="w-80 p-2 outline-none">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) pick(results[0])
            }}
            placeholder={t("Name, email or desk…")}
            aria-label={t("Search people and desks")}
            className="mb-2 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
          {results.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">
              {t("No people or desks match.")}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {results.map((r) => (
                <li key={r.key}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    disabled={!r.deskId}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-foreground/5 disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    {r.member ? (
                      <MemberAvatar m={r.member} className="size-8 rounded-full" />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full bg-accent/15 text-accent">
                        <Armchair className="size-4" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {r.title}
                      </span>
                      <span className="block truncate text-xs text-muted">{r.subtitle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
