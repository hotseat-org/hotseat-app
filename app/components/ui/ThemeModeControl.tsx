import clsx from "clsx"
import { MonitorSmartphone, Moon, Sun, type LucideIcon } from "lucide-react"
import { Theme, useTheme } from "remix-themes"
import { getWordChoiceClass } from "./wordChoice"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"

type Mode = "light" | "dark" | "device"

const MODES: { id: Mode; label: string; icon: LucideIcon }[] = [
  { id: "light", label: msg("Light"), icon: Sun },
  { id: "dark", label: msg("Dark"), icon: Moon },
  { id: "device", label: msg("Same as device"), icon: MonitorSmartphone },
]

/**
 * A row of choices as one pill (a radio group): each a name, or (compact) an
 * icon. As words (`isWords`): the names alone, the chosen one underlined (the
 * headline's menus).
 */
export const SegmentedControl = <T extends string>({
  label,
  options,
  value,
  onChange,
  isWords = false,
}: {
  label: string
  options: { id: T; label: string; lang?: string; icon?: LucideIcon }[]
  value: T
  onChange: (id: T) => void
  isWords?: boolean
}) => (
  <div
    role="radiogroup"
    aria-label={label}
    className={clsx(
      "flex",
      isWords ? "flex-wrap gap-x-4" : "gap-1 rounded-full border border-border bg-segment p-1"
    )}
  >
    {options.map((option) => {
      const isOn = option.id === value
      const Icon = option.icon

      return (
        <button
          key={option.id}
          type="button"
          role="radio"
          lang={option.lang}
          aria-checked={isOn}
          aria-label={Icon ? option.label : undefined}
          title={Icon ? option.label : undefined}
          onClick={() => onChange(option.id)}
          className={clsx(
            "grid place-items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
            getOptionLook({ isWords, isOn, hasIcon: !!Icon })
          )}
        >
          {Icon ? <Icon className="size-4" /> : option.label}
        </button>
      )
    })}
  </div>
)

/** One choice's look: a word (underlined when chosen), or a segment of the pill. */
const getOptionLook = ({
  isWords,
  isOn,
  hasIcon,
}: {
  isWords: boolean
  isOn: boolean
  hasIcon: boolean
}) => {
  if (isWords) return getWordChoiceClass(isOn)

  return clsx(
    "min-h-9 text-sm",
    hasIcon ? "min-w-10 px-2.5" : "px-4",
    isOn
      ? "bg-accent font-extrabold text-accent-foreground"
      : "font-bold text-muted hover:text-foreground"
  )
}

/**
 * Light, dark, or following the device — the same three as Settings ›
 * Appearance. Compact: icons, named for screen readers and on hover.
 */
export const ThemeModeControl = ({
  isCompact = false,
  isWords = false,
}: {
  isCompact?: boolean
  /** Its names as words, the chosen one underlined (the account menu). */
  isWords?: boolean
}) => {
  const [theme, setTheme, themeMetadata] = useTheme()
  const { t } = useI18n()
  const mode: Mode =
    themeMetadata.definedBy === "SYSTEM" ? "device" : theme === Theme.DARK ? "dark" : "light"
  const pickMode = (next: Mode) =>
    setTheme(next === "device" ? null : next === "dark" ? Theme.DARK : Theme.LIGHT)

  return (
    <SegmentedControl
      label={t("Mode")}
      options={MODES.map((option) => ({
        id: option.id,
        label: t(option.label),
        icon: isCompact ? option.icon : undefined,
      }))}
      isWords={isWords}
      value={mode}
      onChange={pickMode}
    />
  )
}
