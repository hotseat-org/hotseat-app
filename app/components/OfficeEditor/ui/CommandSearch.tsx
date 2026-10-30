import { Kbd } from "@heroui/react"
import clsx from "clsx"
import { Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { useEditorStore, useEditorStoreApi } from "../store"
import { scoreMatch, type Command } from "./commands"
import { useI18n } from "~/i18n/I18nProvider"

interface Props {
  commands: Command[]
}

/**
 * The command search (⌘K): everything the editor can do — tools, every piece
 * in the catalog, selection and view actions — found by typing a few letters
 * (in either language, accents optional) and run with Enter.
 */
export const CommandSearch = ({ commands }: Props) => {
  const isOpen = useEditorStore((state) => state.isCommandSearchOpen)
  if (!isOpen) return null
  return <CommandSearchDialog commands={commands} />
}

const CommandSearchDialog = ({ commands }: Props) => {
  const { t } = useI18n()
  const store = useEditorStoreApi()
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const close = () => store.getState().setCommandSearchOpen(false)

  const results = useMemo(() => {
    const state = store.getState()
    return commands
      .filter((command) => command.isAvailable(state))
      .map((command, order) => ({
        command: command,
        order,
        // Found by its shown (translated) name or its English one.
        score: Math.max(scoreMatch(t(command.label), query), scoreMatch(command.label, query)),
      }))
      .filter((result) => result.score > 0)
      .sort((first, second) => second.score - first.score || first.order - second.order)
      .map((result) => result.command)
  }, [commands, query, store, t])

  useEffect(() => setActiveIndex(0), [query])
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const run = (command: Command) => {
    close()
    command.run(store.getState())
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    // The editor's own shortcuts (arrows nudge, Esc deselects) stay out of it.
    event.stopPropagation()
    if (event.key === "Escape") return close()
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const step = event.key === "ArrowDown" ? 1 : -1
      setActiveIndex((i) => (results.length ? (i + step + results.length) % results.length : 0))
      return
    }
    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault()
      run(results[activeIndex])
    }
  }

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex justify-center bg-black/20 px-4 pt-[12vh]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Search commands")}
        className="flex h-[min(26rem,70vh)] w-[min(34rem,100%)] flex-col overflow-hidden rounded-2xl border border-border bg-overlay/95 text-foreground shadow-overlay backdrop-blur-md"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="command-search-list"
            aria-activedescendant={
              results[activeIndex] ? `command-${results[activeIndex].id}` : undefined
            }
            aria-autocomplete="list"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={(event) => {
              // Clicking a result keeps the dialog; clicking away closes it.
              if (!event.currentTarget.closest("[role=dialog]")?.contains(event.relatedTarget))
                close()
            }}
            placeholder={t("Search commands and pieces…")}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul
          id="command-search-list"
          ref={listRef}
          role="listbox"
          aria-label={t("Commands")}
          className="min-h-0 flex-1 overflow-y-auto p-1.5"
        >
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">{t("Nothing matches.")}</li>
          )}
          {results.map((command, index) => {
            const Icon = command.icon
            const isActive = index === activeIndex
            return (
              <li
                key={command.id}
                id={`command-${command.id}`}
                role="option"
                aria-selected={isActive}
                data-index={index}
                tabIndex={-1}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => run(command)}
                className={clsx(
                  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm",
                  isActive ? "bg-accent/15 text-foreground" : "text-foreground/90"
                )}
              >
                <Icon
                  className={clsx("size-4 shrink-0", isActive ? "text-accent" : "text-muted")}
                />
                <span className="min-w-0 flex-1 truncate">{t(command.label)}</span>
                <span className="shrink-0 text-xs text-muted">{t(command.group)}</span>
                {command.shortcut && <Kbd className="shrink-0">{command.shortcut}</Kbd>}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
