import clsx from "clsx"
import { MousePointerClick, Trash2 } from "lucide-react"
import { useState, type CSSProperties } from "react"
import { useKitLibrary } from "../kits"
import { useEditorStore } from "../store"
import { isSeatable } from "../types"
import { KitPlan } from "./KitPlan"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * The saved rooms: pick one and click the floor to place it whole — walls,
 * doors, furniture — as often as you like (Esc to stop). Saved from the
 * right-click menu inside a room.
 */
export const KitsPanel = ({ style }: { style?: CSSProperties }) => {
  const { t, tn, format } = useI18n()
  const { kits, deleteKit } = useKitLibrary()
  const armedKit = useEditorStore((state) => state.armedKit)
  const armKit = useEditorStore((state) => state.armKit)
  // Deleting asks once more, on the same button (there's no undo for it).
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  return (
    <div
      style={style}
      className="pointer-events-auto absolute left-full top-0 ml-2 flex w-60 flex-col rounded-2xl border border-border bg-overlay/90 p-3 shadow-overlay backdrop-blur-md"
    >
      <h2 className="mb-0.5 shrink-0 px-1 text-sm font-semibold text-foreground">
        {t("Saved rooms")}
      </h2>
      <p className="mb-2 shrink-0 px-1 text-[11px] leading-snug text-muted">
        {kits.length
          ? t("Pick one, then click the floor to place it — walls, doors and all.")
          : t("Right-click inside a room and choose “Save this room” to place it again anywhere.")}
      </p>

      {kits.length === 0 && (
        <div className="grid flex-1 place-items-center text-muted/60">
          <MousePointerClick className="size-10" strokeWidth={1.5} />
        </div>
      )}

      <div className="-mr-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-width:thin]">
        {kits.map((kit) => {
          const isArmed = armedKit?.id === kit.id
          const deskCount = kit.objects.filter((object) => isSeatable(object.type)).length
          const isConfirming = confirmingId === kit.id
          return (
            <div key={kit.id} className="group relative">
              <button
                type="button"
                onClick={() => armKit(isArmed ? null : kit)}
                aria-pressed={isArmed}
                className={clsx(
                  "flex w-full flex-col gap-1 rounded-xl border p-2 text-left transition-colors",
                  isArmed
                    ? "border-accent bg-accent/15"
                    : "border-border bg-foreground/[0.04] hover:border-accent/50 hover:bg-foreground/10"
                )}
              >
                <KitPlan objects={kit.objects} className="h-20 w-full" />
                <span className="truncate text-xs font-semibold text-foreground">{kit.name}</span>
                <span className="text-[11px] text-muted">
                  {format.number(Math.round(kit.area * 10) / 10)} m²
                  {deskCount > 0 && ` · ${tn(deskCount, "{n} desk", "{n} desks")}`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isConfirming) return setConfirmingId(kit.id)
                  if (isArmed) armKit(null)
                  deleteKit(kit.id)
                }}
                onBlur={() => setConfirmingId(null)}
                aria-label={isConfirming ? t("Delete for good") : t("Delete")}
                title={isConfirming ? t("Delete for good") : t("Delete")}
                className={clsx(
                  "absolute right-1.5 top-1.5 flex h-7 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold transition",
                  isConfirming
                    ? "bg-danger text-danger-foreground"
                    : "text-muted opacity-0 hover:bg-danger/15 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                )}
              >
                <Trash2 className="size-3.5" />
                {isConfirming && t("Delete for good")}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
