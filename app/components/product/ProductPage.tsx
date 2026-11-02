import clsx from "clsx"
import {
  Armchair,
  BarChart3,
  CalendarDays,
  Check,
  Footprints,
  Layers,
  PencilRuler,
  Pin,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"
import { HotseatLockup } from "~/components/HotseatMark"
import { useI18n } from "~/i18n/I18nProvider"
import { LOCALES, LOCALE_NAMES } from "~/i18n/locales"
import { useLocale } from "~/i18n/useLocale"

/** The page's own pictures (public/images/product): a template office, and the demo organization's. */
const PICTURES = {
  office: `${import.meta.env.BASE_URL}images/product/office-3d.jpg`,
  editor: `${import.meta.env.BASE_URL}images/product/office-editor.jpg`,
  findSeat: `${import.meta.env.BASE_URL}images/product/find-a-seat.jpg`,
  whosIn: `${import.meta.env.BASE_URL}images/product/whos-in.jpg`,
  phone: `${import.meta.env.BASE_URL}images/product/phone.jpg`,
  insights: `${import.meta.env.BASE_URL}images/product/insights.jpg`,
}

/** The night blue of the sign-in screen: the closing call to action stands on it. */
const NIGHT = "#1f2850"

const PRIMARY_LINK =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-[15px] font-black text-accent-foreground shadow-sm outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
const SECONDARY_LINK =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-[15px] font-extrabold text-foreground outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"

/**
 * Hotseat's product page — the front door for companies not using it yet:
 * what it does (each of it real, shown on a template office), how to start,
 * and getting started (signing up) or trying the editor without an account.
 */
export const ProductPage = () => {
  const { t } = useI18n()

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Header />

      <main>
        <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-10 pb-16 text-center sm:px-6 sm:pt-16">
          <p className="rounded-full bg-accent/12 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-accent">
            {t("Desk booking for hybrid offices")}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.02em] sm:text-6xl">
            {t("Your office as a map everyone can book from")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            {t(
              "Draw your floor plan in 3D, and let people book a desk for a day, every Monday, or next to the colleagues they work with — on a laptop or a phone."
            )}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/login" className={PRIMARY_LINK}>
              {t("Get started")}
            </Link>
            <Link to="/office-editor" className={SECONDARY_LINK}>
              {t("Try the editor")}
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted">{t("No account needed to try the editor.")}</p>

          <Picture
            src={PICTURES.office}
            alt={t(
              "An office in Hotseat: desks labelled D-1 to D-36, meeting rooms and a lounge, in 3D"
            )}
            className="mt-12"
            isEager
          />
        </section>

        <section id="features" className="scroll-mt-20 bg-surface-secondary py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              title={t("Everything a shared office needs")}
              lead={t("For the people booking a desk, and for whoever runs the office.")}
            />
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Feature icon={CalendarDays} title={t("Book a desk for any day")}>
                {t(
                  "One day, every Tuesday and Thursday, or a stretch of days — and see who's in at a glance."
                )}
              </Feature>
              <Feature icon={Armchair} title={t("Find me a seat")}>
                {t(
                  "Say what you'd like — your team's zone, near a colleague, your preferred seat — and get the desk that fits best."
                )}
              </Feature>
              <Feature icon={Users} title={t("Who's in")}>
                {t(
                  "See who's in the office each day and where they sit, and find their desk on the map."
                )}
              </Feature>
              <Feature icon={Pin} title={t("Permanent desks")}>
                {t(
                  "Give people a desk of their own. When they're away, they give it up for the day and others can book it."
                )}
              </Feature>
              <Feature icon={PencilRuler} title={t("Draw your office in 3D")}>
                {t(
                  "Walls, doors, windows and a catalogue of furniture, several floors — or a ready-made template to start from."
                )}
              </Feature>
              <Feature icon={Layers} title={t("Zones for teams")}>
                {t("Colour the floor by team and number the desks after their zone.")}
              </Feature>
              <Feature icon={Footprints} title={t("Show the way")}>
                {t("Directions to any desk, from the entrance or your own desk, across floors.")}
              </Feature>
              <Feature icon={BarChart3} title={t("Insights for admins")}>
                {t(
                  "See which desks are used and how full the office gets, to plan the space you have."
                )}
              </Feature>
              <Feature icon={Smartphone} title={t("Made for phones too")}>
                {t(
                  "A simple floor plan and booking where your thumb reaches — in English and Czech."
                )}
              </Feature>
            </ul>
          </div>
        </section>

        <div className="mx-auto flex max-w-6xl flex-col gap-24 px-4 py-24 sm:px-6">
          <Showcase
            title={t("Find me a seat")}
            lead={t(
              "Say it once, in a sentence: the zone you'd like, the colleague to sit near, a standing desk. Hotseat picks the desk that fits best, for today or any day."
            )}
            points={[
              t("Remembered for next time"),
              t("Shows what fits and what doesn't"),
              t("Booked in one tap"),
            ]}
            picture={
              <Picture
                src={PICTURES.findSeat}
                alt={t(
                  "Find a seat: “A seat today, ideally in Vývoj, with a standing desk and near Adam Černý”, and the closest match, Desk D-6"
                )}
              />
            }
          />
          <Showcase
            title={t("See who's in")}
            lead={t(
              "Everyone in the office that day, with their desk and their week at a glance. Find anyone on the map in one tap."
            )}
            points={[t("Search by name or email"), t("Plan your days around your team")]}
            picture={
              <Picture
                src={PICTURES.whosIn}
                alt={t("Who's in: 18 of 441 people in the office today, each with their desk")}
                className="mx-auto max-w-sm"
              />
            }
            isFlipped
          />
          <Showcase
            title={t("Book from your phone")}
            lead={t(
              "The office as a simple floor plan, with your teams' zones and who sits where. Pick a day with your thumb and find a seat."
            )}
            points={[
              t("Pinch, turn and switch floors"),
              t("Your bookings and colleagues a tab away"),
            ]}
            picture={
              <Picture
                src={PICTURES.phone}
                alt={t(
                  "Hotseat on a phone: the floor plan with zones and people, and days to book"
                )}
                className="mx-auto max-w-[280px] rounded-[calc(var(--radius)*8)]"
              />
            }
          />
          <Showcase
            title={t("Know how the office is used")}
            lead={t(
              "Occupancy by week and by day, the busiest weekday, each floor and each desk — and how often permanent desks are given up."
            )}
            points={[t("Look back or plan ahead"), t("Export to CSV")]}
            picture={
              <Picture
                src={PICTURES.insights}
                alt={t(
                  "Insights: 54% occupancy, Tuesday the busiest weekday, desks in use per week and a heatmap of every working day"
                )}
              />
            }
            isFlipped
          />
          <Showcase
            title={t("Set up in an afternoon")}
            lead={t(
              "Start from a template or draw your own floor plan. Rooms measure themselves, desks are numbered in one click, and every change is saved as you go."
            )}
            points={[t("Walls, doors, windows and furniture"), t("Several floors")]}
            picture={
              <Picture
                src={PICTURES.editor}
                alt={t(
                  "Hotseat's office editor: a catalogue of furniture beside an office in 3D, its rooms measured"
                )}
              />
            }
          />
        </div>

        <section id="how" className="scroll-mt-20 bg-surface-secondary py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading title={t("How it works")} />
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              <Step number={1} title={t("Create your organization")}>
                {t("Sign in with Google or GitHub and name your company.")}
              </Step>
              <Step number={2} title={t("Draw your office")}>
                {t("Start from a template or draw walls and furniture; add floors as you grow.")}
              </Step>
              <Step number={3} title={t("Invite your team")}>
                {t("Share a link: people join and book their first desk in seconds.")}
              </Step>
            </ol>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <div
            className="mx-auto flex max-w-6xl flex-col items-center rounded-[calc(var(--radius)*6)] px-6 py-16 text-center text-[#f4efe6]"
            style={{ background: NIGHT }}
          >
            <h2 className="max-w-2xl text-3xl font-black tracking-[-0.01em] sm:text-4xl">
              {t("Give your office a map")}
            </h2>
            <p className="mt-4 max-w-xl text-lg text-[#c9cde0]">
              {t("Set up your first office today. Your team can book desks as soon as they join.")}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/login" className={PRIMARY_LINK}>
                {t("Get started")}
              </Link>
              <Link
                to="/office-editor"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#f4efe6]/30 px-6 text-[15px] font-extrabold text-[#f4efe6] outline-none transition-colors hover:bg-[#f4efe6]/10 focus-visible:ring-2 focus-visible:ring-[#f4efe6]"
              >
                {t("Try the editor")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

const Header = () => {
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          to="/"
          aria-label="Hotseat"
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <HotseatLockup size={30} />
        </Link>
        <nav aria-label={t("Product")} className="ml-4 hidden gap-1 md:flex">
          <a
            href="#features"
            className="rounded-full px-3 py-2 text-sm font-bold text-muted hover:text-foreground"
          >
            {t("What it does")}
          </a>
          <a
            href="#how"
            className="rounded-full px-3 py-2 text-sm font-bold text-muted hover:text-foreground"
          >
            {t("How it works")}
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/login"
            className="hidden min-h-10 items-center rounded-full px-4 text-sm font-extrabold text-foreground hover:bg-surface-secondary sm:inline-flex"
          >
            {t("Sign in")}
          </Link>
          <Link to="/login" className={clsx(PRIMARY_LINK, "min-h-10 px-5 text-sm")}>
            {t("Get started")}
          </Link>
        </div>
      </div>
    </header>
  )
}

const Footer = () => {
  const { t } = useI18n()
  const [locale, pickLocale] = useLocale()

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-8 sm:px-6">
        <HotseatLockup size={22} />
        <p className="text-sm text-muted">© {new Date().getFullYear()} Hotseat</p>
        <div className="ml-auto flex items-center gap-1 text-[13px] font-bold">
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              lang={option}
              aria-pressed={option === locale}
              onClick={() => pickLocale(option)}
              className={clsx(
                "min-h-9 rounded-full px-3 transition-colors",
                option === locale
                  ? "bg-surface-secondary text-foreground"
                  : "text-muted hover:text-foreground"
              )}
            >
              {LOCALE_NAMES[option]}
            </button>
          ))}
          <Link
            to="/login"
            className="ml-2 min-h-9 rounded-full px-3 py-2 text-muted hover:text-foreground"
          >
            {t("Sign in")}
          </Link>
        </div>
      </div>
    </footer>
  )
}

const Picture = ({
  src,
  alt,
  className,
  isEager = false,
}: {
  src: string
  alt: string
  className?: string
  /** The first picture on the page: loaded at once, not when scrolled to. */
  isEager?: boolean
}) => (
  <div
    className={clsx(
      "w-full overflow-hidden rounded-[calc(var(--radius)*4)] border border-border bg-surface shadow-overlay",
      className
    )}
  >
    <img src={src} alt={alt} loading={isEager ? "eager" : "lazy"} className="block h-auto w-full" />
  </div>
)

/** A feature up close: its picture beside what it does (sides alternate down the page). */
const Showcase = ({
  title,
  lead,
  points,
  picture,
  isFlipped = false,
}: {
  title: string
  lead: string
  points: string[]
  picture: ReactNode
  isFlipped?: boolean
}) => (
  <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
    <div className={clsx(isFlipped && "lg:order-2")}>
      <h2 className="text-3xl font-black tracking-[-0.01em] sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg leading-relaxed text-muted">{lead}</p>
      <ul className="mt-6 flex flex-col gap-2.5">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-2.5 font-bold">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success/15 text-success">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            {point}
          </li>
        ))}
      </ul>
    </div>
    {picture}
  </section>
)

const SectionHeading = ({ title, lead }: { title: string; lead?: string }) => (
  <div className="mx-auto max-w-2xl text-center">
    <h2 className="text-3xl font-black tracking-[-0.01em] sm:text-4xl">{title}</h2>
    {lead && <p className="mt-3 text-lg text-muted">{lead}</p>}
  </div>
)

const Feature = ({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) => (
  <li className="rounded-2xl border border-border bg-surface p-6">
    <span className="grid size-11 place-items-center rounded-xl bg-accent/12 text-accent">
      <Icon className="size-5" />
    </span>
    <h3 className="mt-4 text-lg font-black">{title}</h3>
    <p className="mt-1.5 leading-relaxed text-muted">{children}</p>
  </li>
)

const Step = ({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: ReactNode
}) => (
  <li className="rounded-2xl border border-border bg-surface p-6">
    <span className="grid size-10 place-items-center rounded-full bg-accent text-base font-black text-accent-foreground">
      {number}
    </span>
    <h3 className="mt-4 text-lg font-black">{title}</h3>
    <p className="mt-1.5 leading-relaxed text-muted">{children}</p>
  </li>
)
