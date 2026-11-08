import { Modal, Spinner } from "@heroui/react"
import { useDebounce } from "@uidotdev/usehooks"
import clsx from "clsx"
import { Check, X } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { useFetcher } from "react-router"
import { uploadImage } from "~/components/Inputs/ImageUpload"
import { BottomSheet } from "~/components/ui/BottomSheet"
import { useIsMobile } from "~/utils/hooks/useIsMobile"
import { DialogCloseButton } from "~/components/ui/DialogCloseButton"
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
 * A create dialog (a new organization, a new office): centred on larger
 * screens, a sheet up from the bottom on a phone. Its content gets `close`,
 * which slides a sheet away before it goes.
 */
export const CreateDialog = ({
  label,
  onClose,
  children,
}: {
  label: string
  onClose: () => void
  children: (close: () => void) => ReactNode
}) => {
  const isMobile = useIsMobile()
  if (isMobile)
    return (
      <BottomSheet label={label} isFlush onClose={onClose}>
        {children}
      </BottomSheet>
    )

  return (
    <Modal isOpen onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="w-[min(600px,94vw)] max-w-none overflow-hidden p-0">
            {children(onClose)}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
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
      <label htmlFor="create-name" className="text-base font-extrabold text-muted">
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
          "w-full border-0 border-b-[3px] border-foreground bg-transparent pt-1 pb-2 text-[40px] leading-tight font-black tracking-[-0.03em] text-foreground outline-none transition-colors",
          "placeholder:text-muted/50",
          availability === "taken" ? "border-danger" : "focus:border-accent",
          isCentered && "text-center"
        )}
      />
      {/* Fixed height: the line changes, the modal doesn't move. */}
      <p className="flex h-6 items-center gap-1.5 text-base font-bold text-muted">
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

/**
 * A create dialog's top: its title as a headline ("New office."), a sentence
 * on what comes next, and the ring to close it.
 */
export const CreateHeader = ({
  title,
  summary,
  onClose,
}: {
  title: string
  summary: string
  onClose: () => void
}) => (
  <div className="flex items-start gap-4">
    <div className="min-w-0 flex-1">
      <h2 className="text-[56px] leading-[0.95] font-black tracking-[-0.035em] text-foreground">
        {title}
      </h2>
      <p className="mt-3 text-xl leading-snug font-extrabold text-muted">{summary}</p>
    </div>
    <DialogCloseButton onClose={onClose} />
  </div>
)

/**
 * Picking a picture (a cover, a logo) as a word beside the actions: "Add a
 * cover photo", or once picked, its thumbnail and "Change".
 */
export const PictureWord = ({
  upload,
  addLabel,
  changeLabel,
}: {
  upload: ReturnType<typeof useImageUpload>
  addLabel: string
  changeLabel: string
}) => (
  <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-lg font-extrabold text-foreground underline decoration-2 underline-offset-[5px] focus-within:ring-2 focus-within:ring-focus">
    <input
      type="file"
      accept={IMAGE_TYPES}
      className="sr-only"
      onChange={(event) => upload.pick(event.target.files?.[0])}
    />
    {upload.isUploading && <Spinner size="sm" />}
    {upload.preview && !upload.isUploading && (
      <img src={upload.preview} alt="" className="size-9 rounded-lg object-cover" />
    )}
    {upload.preview ? changeLabel : addLabel}
  </label>
)
