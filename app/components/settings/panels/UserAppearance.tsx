import clsx from "clsx"
import { Check } from "lucide-react"
import { CardTitle, SettingsCard } from "../ui"
import { SegmentedControl, ThemeModeControl } from "~/components/ui/ThemeModeControl"
import { useScheme } from "~/utils/hooks/useScheme"
import { SCHEMES, type SchemeHalf } from "~/utils/schemes"
import { useI18n } from "~/i18n/I18nProvider"
import { LOCALES, LOCALE_NAMES } from "~/i18n/locales"
import { useLocale } from "~/i18n/useLocale"

/**
 * How Hotseat looks on this device: its language, light, dark or following the
 * device, and a colour scheme (each with a light and a dark half). All per
 * device — teammates keep their own.
 */
export function UserAppearance() {
  const [scheme, setScheme] = useScheme()
  const [locale, pickLocale] = useLocale()
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>{t("Language")}</CardTitle>
          <p className="mt-1 text-sm text-muted">
            {t("The language Hotseat speaks on this device.")}
          </p>
        </div>
        <SegmentedControl
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
        <ThemeModeControl />
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
