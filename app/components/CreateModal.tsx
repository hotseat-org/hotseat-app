import { Spinner } from "@heroui/react"
import { useDebounce } from "@uidotdev/usehooks"
import clsx from "clsx"
import { Check, X } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { useFetcher } from "react-router"
import { uploadImage } from "~/components/Inputs/ImageUpload"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * Shared pieces of the "create" modals (new office, new organization): a
 * contour-line banner to put a picture on, the name typed big like a title,
 * and a live line saying where it will live and whether that's free.
 */

export type Availability = "unknown" | "checking" | "available" | "taken"

/**
 * Live check of a name while it's typed: posts `{ name, intent }` to `action`
 * (debounced), which answers true when the name's URL is free.
 */
export const useNameCheck = ({ action, intent }: { action: string; intent: string }) => {
  const [name, setName] = useState("")
  const debouncedName = useDebounce(name.trim(), 400)
  const { submit, state, data } = useFetcher<boolean>()
  useEffect(() => {
    if (debouncedName) submit({ name: debouncedName, intent }, { method: "POST", action })
    // Only a new name should trigger a check.
  }, [debouncedName])
  // The answer is in once the post returns ("loading" is only the page's own
  // revalidation after it, which can be slow on a 3D office).
  const isStale = debouncedName !== name.trim() || state === "submitting"
  const availability: Availability = !name.trim()
    ? "unknown"
    : isStale || data === undefined
      ? "checking"
      : data
        ? "available"
        : "taken"
  return { name, setName, availability }
}

/** An image picked for upload: shown at once (local preview), its id once uploaded. */
export const useImageUpload = () => {
  const [preview, setPreview] = useState<string>()
  const [id, setId] = useState<string>()
  const [isUploading, setIsUploading] = useState(false)
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])
  const pick = async (file?: File) => {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setId(undefined)
    setIsUploading(true)
    try {
      setId(await uploadImage(file))
    } catch {
      setPreview(undefined) // failed: back to "add one"
    } finally {
      setIsUploading(false)
    }
  }
  return { preview, id, isUploading, pick }
}

export const IMAGE_TYPES = ".svg,.png,.gif,.jpg,.jpeg,.webp"

/**
 * The modal's header: soft contour lines — the landscape the offices sit in —
 * or, once one is picked, the cover photo. `tone` "accent" tints it blue.
 */
export const ContourBanner = ({
  image,
  tone = "warm",
  className,
  children,
}: {
  image?: string
  tone?: "warm" | "accent"
  className?: string
  children?: ReactNode
}) => (
  <div
    className={clsx(
      "relative flex items-center justify-center overflow-hidden",
      tone === "warm" ? "bg-surface-tertiary text-border" : "bg-accent/10 text-accent/25",
      className
    )}
  >
    {image ? (
      <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
    ) : (
      <svg
        aria-hidden
        viewBox="0 0 460 190"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
        className="absolute inset-0 size-full"
      >
        {tone === "warm" ? (
          <>
            <path
              d="M230 60C290 58 320 80 318 98S280 136 228 134 140 122 142 98 175 62 230 60Z"
              className="fill-surface-secondary"
            />
            <path d="M230 40C310 36 350 70 348 100S300 156 226 154 112 136 114 98 160 44 230 40Z" />
            <path d="M232 20C330 14 382 62 380 102S318 178 222 176 82 150 84 98 146 26 232 20Z" />
            <path d="M-10 30C40 10 70 60 40 90S-10 140-10 140" />
            <path d="M470 160C420 150 400 110 430 80S470 40 470 40" />
          </>
        ) : (
          <>
            <path d="M-10 40C80 10 160 80 250 50S400 0 470 40" />
            <path d="M-10 75C80 45 170 115 260 85S400 35 470 75" />
            <path d="M-10 110C90 80 180 150 270 120S400 70 470 110" />
            <path d="M-10 145C100 115 190 185 280 155S400 105 470 145" />
          </>
        )}
      </svg>
    )}
    {children}
  </div>
)

/** Round "×" over the banner. */
export const BannerClose = ({ onPress }: { onPress: () => void }) => {
  const { t } = useI18n()
  return (
    <button
      type="button"
      aria-label={t("Close")}
      onClick={onPress}
      className="absolute top-3.5 right-3.5 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full bg-overlay/85 text-foreground transition-colors hover:bg-overlay"
    >
      <X size={16} strokeWidth={2.4} />
    </button>
  )
}

/**
 * The name, typed big like a title (an underline, not a box), with its small
 * label above and, below, where it will live and whether that's free.
 */
export const TitleNameField = ({
  label,
  placeholder,
  name,
  onChange,
  path,
  slug,
  availability,
  isCentered = false,
}: {
  label: string
  placeholder: string
  name: string
  onChange: (name: string) => void
  /** The URL up to the slug ("…/offices/"). */
  path: string
  slug: string
  availability: Availability
  isCentered?: boolean
}) => {
  const { t } = useI18n()
  return (
    <div className={clsx("flex w-full flex-col gap-1.5", isCentered && "items-center")}>
      <label
        htmlFor="create-name"
        className="text-xs font-extrabold tracking-[0.06em] text-muted uppercase"
      >
        {label}
      </label>
      <input
        id="create-name"
        name="name"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus
        required
        className={clsx(
          "w-full border-0 border-b-2 border-border bg-transparent pt-1 pb-2 text-[28px] font-black text-foreground outline-none transition-colors",
          "placeholder:text-muted/50",
          availability === "taken" ? "border-danger" : "focus:border-accent",
          isCentered && "text-center"
        )}
      />
      {/* Fixed height: the line changes, the modal doesn't move. */}
      <p className="flex h-5 items-center gap-1.5 text-[13px] text-muted">
        {availability === "checking" && <Spinner size="sm" className="size-3.5 shrink-0" />}
        {availability === "available" && (
          <Check size={14} strokeWidth={3} className="shrink-0 animate-icon-pop text-success" />
        )}
        {availability === "taken" && (
          <X size={14} strokeWidth={3} className="shrink-0 animate-icon-pop text-danger" />
        )}
        <span className="truncate">
          {path}
          <strong className="font-bold text-foreground">{slug || "…"}</strong>
          {availability === "available" && ` ${t("is free")}`}
          {availability === "taken" && <span className="text-danger"> {t("is taken")}</span>}
        </span>
      </p>
    </div>
  )
}
