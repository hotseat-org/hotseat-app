import clsx from "clsx"
import { Check } from "lucide-react"
import { Theme, useTheme } from "remix-themes"
import { CardTitle, SettingsCard } from "../ui"
import { useScheme } from "~/utils/hooks/useScheme"
import { SCHEMES, type SchemeHalf } from "~/utils/schemes"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"
import { LOCALES, LOCALE_NAMES } from "~/i18n/locales"
import { useLocale } from "~/i18n/useLocale"

type Mode = "light" | "dark" | "device"

const MODES: { id: Mode; label: string }[] = [
  { id: "light", label: msg("Light") },
  { id: "dark", label: msg("Dark") },
  { id: "device", label: msg("Same as device") },
]

/** A row of choices as one pill (a radio group). */
const Segment = <T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: T; label: string; lang?: string }[]
  value: T
  onChange: (id: T) => void
}) => (
  <div
    role="radiogroup"
    aria-label={label}
    className="flex gap-1 rounded-full border border-border bg-segment p-1"
  >
    {options.map((o) => {
      const isOn = o.id === value
      return (
        <button
          key={o.id}
          type="button"
          role="radio"
          lang={o.lang}
          aria-checked={isOn}
          onClick={() => onChange(o.id)}
          className={clsx(
            "min-h-9 rounded-full px-4 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
            isOn
              ? "bg-accent font-extrabold text-accent-foreground"
              : "font-bold text-muted hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      )
    })}
  </div>
)

/**
 * How Hotseat looks on this device: its language, light, dark or following the
 * device, and a colour scheme (each with a light and a dark half). All per
 * device — teammates keep their own.
 */
export function UserAppearance() {
  const [theme, setTheme, themeMetadata] = useTheme()
  const [scheme, setScheme] = useScheme()
  const [locale, pickLocale] = useLocale()
  const { t } = useI18n()
  const mode: Mode =
    themeMetadata.definedBy === "SYSTEM" ? "device" : theme === Theme.DARK ? "dark" : "light"

  const pickMode = (next: Mode) =>
    setTheme(next === "device" ? null : next === "dark" ? Theme.DARK : Theme.LIGHT)

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>{t("Language")}</CardTitle>
          <p className="mt-1 text-sm text-muted">
            {t("The language Hotseat speaks on this device.")}
          </p>
        </div>
        <Segment
          label={t("Language")}
          // Each language in itself, so anyone can find theirs.
          options={LOCALES.map((l) => ({ id: l, label: LOCALE_NAMES[l], lang: l }))}
          value={locale}
          onChange={pickLocale}
        />
      </SettingsCard>

      <SettingsCard className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>{t("Mode")}</CardTitle>
          <p className="mt-1 text-sm text-muted">{t("Light, dark, or follow your device.")}</p>
        </div>
        <Segment
          label={t("Mode")}
          options={MODES.map((m) => ({ id: m.id, label: t(m.label) }))}
          value={mode}
          onChange={pickMode}
        />
      </SettingsCard>

      <SettingsCard className="flex flex-col gap-4">
        <div>
          <CardTitle>{t("Colour scheme")}</CardTitle>
          <p className="mt-1 text-sm text-muted">
            {t("Each one has a light and a dark version. Saved on this device.")}
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label={t("Colour scheme")}
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
        >
          {SCHEMES.map((s) => {
            const isOn = s.id === scheme
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={isOn}
                onClick={() => setScheme(s.id)}
                className={clsx(
                  // Explicit px radius: the theme's --radius scales rounded-2xl up to ~27px.
                  "relative rounded-[14px] border-2 bg-surface p-2.5 pb-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                  isOn ? "border-accent" : "border-border hover:border-muted"
                )}
              >
                <span className="flex h-16 overflow-hidden rounded-[8px]">
                  <SchemeTile half={s.light} />
                  <SchemeTile half={s.dark} />
                </span>
                <span className="block px-1 pt-2.5 text-sm font-extrabold text-foreground">
                  {t(s.name)}
                </span>
                <span className="block px-1 pt-0.5 text-xs text-muted">{t(s.description)}</span>
                {isOn && (
                  <span className="absolute right-4 top-4 grid size-5 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Check className="size-3" strokeWidth={3.5} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </SettingsCard>
    </div>
  )
}

/** Half a scheme card: its page, a panel on it, and its accent. */
const SchemeTile = ({ half }: { half: SchemeHalf }) => (
  <span aria-hidden className="relative flex-1" style={{ background: half.background }}>
    <span
      className="absolute inset-x-2 top-2.5 h-[22px] rounded-[5px] border"
      style={{ background: half.surface, borderColor: half.border }}
    />
    <span
      className="absolute bottom-2 left-2 h-3 w-[26px] rounded-full"
      style={{ background: half.accent }}
    />
  </span>
)
