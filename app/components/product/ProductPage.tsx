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
import { Form, Link, useNavigation } from "react-router"
import { DUSK, HotseatLockup } from "~/components/HotseatMark"
import { Horizon, NIGHT, NightSky, useIsAnimated } from "~/components/NightScene"
import { Rich, useI18n } from "~/i18n/I18nProvider"
import { LOCALES, LOCALE_NAMES } from "~/i18n/locales"
import { useLocale } from "~/i18n/useLocale"

/** The page's own pictures (public/images/product): the Fern & Fox demo, see scripts/seed-demo.ts. */
const PICTURES = {
  office: `${import.meta.env.BASE_URL}images/product/office-3d.jpg`,
  editor: `${import.meta.env.BASE_URL}images/product/office-editor.jpg`,
  findSeat: `${import.meta.env.BASE_URL}images/product/find-a-seat.jpg`,
  whosIn: `${import.meta.env.BASE_URL}images/product/whos-in.jpg`,
  phone: `${import.meta.env.BASE_URL}images/product/phone.jpg`,
  insights: `${import.meta.env.BASE_URL}images/product/insights.jpg`,
  teams: `${import.meta.env.BASE_URL}images/product/teams.jpg`,
}

/**
 * On the night blue (the sign-in screen's, the header, the opening and the
 * closing call): its buttons — cream, and outlined.
 */
const PRIMARY_LINK =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[#fbf6ee] px-6 text-[15px] font-black text-[#2c3866] outline-none transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6c560]"
const SECONDARY_LINK =
  "inline-flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-[#4a5688] bg-[#1f2850]/60 px-6 text-[15px] font-extrabold text-[#f4efe6] outline-none transition-colors hover:border-[#7d88b8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6c560]"

/** The whole page is at night: a card a step lighter than the sky, and the text's quieter shades. */
const CARD = "rounded-2xl border border-[#34407a] bg-[#26305c]"
const QUIET_TEXT = "text-[#c9cde0]"
const FAINT_TEXT = "text-[#9aa1c0]"

/**
 * Hotseat's product page — the front door for companies not using it yet:
 * what it does (each of it real, shown on the demo company), how to start,
 * and getting started (signing up) or trying the editor without an account.
 */
export const ProductPage = () => {
  const { t } = useI18n()
  const isAnimated = useIsAnimated()

  return (
    <div className="min-h-dvh text-[#f4efe6]" style={{ background: NIGHT }}>
      <ProductHeader />

      <main>
        {/* At dusk, as signing in is: the night sky, and the horizon's warm lines below the office. */}
        <section className="relative overflow-hidden">
          <NightSky isAnimated={isAnimated} />
          <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 pt-10 text-center sm:px-6 sm:pt-16">
            <p className="rounded-full bg-[#fbf6ee]/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[#f6c560]">
              {t("Desk booking without the paperwork")}
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.02em] sm:text-6xl">
              {t("Your office, minus the musical chairs")}
            </h1>
            <p className={clsx("mt-5 max-w-2xl text-lg leading-relaxed", QUIET_TEXT)}>
              {t(
                "Hotseat puts your office on a map. Grab a desk for tomorrow, for every Tuesday, or right next to the person you actually want to sit with. On a laptop or a phone."
              )}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/login" className={PRIMARY_LINK}>
                {t("Get started")}
              </Link>
              <DemoButton className={SECONDARY_LINK} />
            </div>
            <p className={clsx("mt-3 text-sm", FAINT_TEXT)}>
              {t("No account needed. Go on, knock down a wall.")}
            </p>

            <Picture
              src={PICTURES.office}
              alt={t(
                "A cosy studio office in Hotseat, in 3D: desks with people's faces, free ones in green, a lounge and a glass meeting room"
              )}
              className="mt-12"
              isEager
            />
          </div>
          {/* The office stands on the horizon: its lines run behind the picture's lower part. */}
          <div className="-mt-[clamp(90px,16vw,220px)]">
            <Horizon isAnimated={isAnimated} isWhole />
          </div>
        </section>

        <section id="features" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              title={t("What's inside")}
              lead={t("Small things that save a lot of wandering around.")}
            />
            {/* Each card's icon in one of the horizon's colours, in turn. */}
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Feature icon={CalendarDays} color={DUSK.lines[0]} title={t("Book any day")}>
                {t("Tomorrow, every Tuesday and Thursday, or all of next week. Two taps and done.")}
              </Feature>
              <Feature icon={Armchair} color={DUSK.lines[1]} title={t("Find me a seat")}>
                {t(
                  "Say what you like — your team's corner, near a friend, a desk you can stand at — and it picks one for you."
                )}
              </Feature>
              <Feature icon={Users} color={DUSK.lines[2]} title={t("Who's in")}>
                {t("See who's coming in before you decide to. Or before you decide not to.")}
              </Feature>
              <Feature icon={Pin} color={DUSK.lines[0]} title={t("Permanent desks")}>
                {t(
                  "Some people like a desk of their own. Fair enough. When they're off, it doesn't sit there empty."
                )}
              </Feature>
              <Feature icon={PencilRuler} color={DUSK.lines[1]} title={t("Draw your office in 3D")}>
                {t(
                  "Walls, doors, windows, sofas, plants. More floors if you've got them. Or grab a template and tweak it."
                )}
              </Feature>
              <Feature icon={Layers} color={DUSK.lines[2]} title={t("Teams and their corners")}>
                {t(
                  "Give each team its own patch of floor and the days it comes in together. Finding a seat puts you right next to them."
                )}
              </Feature>
              <Feature icon={Footprints} color={DUSK.lines[0]} title={t("Show the way")}>
                {t("First day? Hotseat walks you from the door to your desk, stairs included.")}
              </Feature>
              <Feature
                icon={BarChart3}
                color={DUSK.lines[1]}
                title={t("Numbers for whoever runs the office")}
              >
                {t(
                  "Which days are packed, which desks nobody wants, and whether you need more room or fewer chairs."
                )}
              </Feature>
              <Feature icon={Smartphone} color={DUSK.lines[2]} title={t("Fits in your pocket")}>
                {t("A simple floor plan made for thumbs. In English and Czech.")}
              </Feature>
            </ul>
          </div>
        </section>

        <div className="mx-auto flex max-w-6xl flex-col gap-24 px-4 py-24 sm:px-6">
          <Showcase
            title={t("Find me a seat")}
            lead={t(
              "“A seat today, ideally with Design, near Theo, at a standing desk.” Hotseat reads that, picks the best desk and tells you straight what it couldn't manage."
            )}
            points={[
              t("Remembers what you like"),
              t("Shows what fits and what doesn't"),
              t("One tap to book"),
            ]}
            picture={
              <Picture
                src={PICTURES.findSeat}
                isPanel
                alt={t(
                  "Find a seat: “A seat today, ideally in Design, near Theo Park, with a standing desk”, and the best match, desk D6"
                )}
              />
            }
          />
          <Showcase
            title={t("Check who's in before you put your shoes on")}
            lead={t(
              "Everyone coming in today, where they sit and how their week looks. Tap Find and the map takes you straight to them."
            )}
            points={[t("Search by name"), t("Plan your days around your people")]}
            picture={
              <Picture
                src={PICTURES.whosIn}
                isPanel
                alt={t("Who's in today, each person with their desk and their week")}
                className="mx-auto max-w-sm"
              />
            }
            isFlipped
          />
          <Showcase
            title={t("Book a desk on the tram")}
            lead={t(
              "Finding a seat, booking it, seeing who's around — all of it works on a phone. You're sorted before your stop."
            )}
            points={[t("Made for thumbs"), t("Bookings and colleagues one tab away")]}
            picture={
              <Picture
                src={PICTURES.phone}
                alt={t("Finding a seat on a phone: the sentence and the best match, desk D6")}
                className="mx-auto max-w-[280px] rounded-[calc(var(--radius)*8)]"
              />
            }
          />
          <Showcase
            title={t("Keep the gang together")}
            lead={t(
              "Put people in teams and give each one its corner of the office and its days. Find a seat sits you next to them, and Who's in shows who's around, team by team."
            )}
            points={[
              t("Team days marked in the calendar"),
              t("A corner kept for the team, if you want one"),
            ]}
            picture={
              <Picture
                src={PICTURES.teams}
                isPanel
                alt={t(
                  "Who's in by team: Design, Engineering, Plant club with its four people, Support — and how many of each are in"
                )}
                className="mx-auto max-w-sm"
              />
            }
            isFlipped
          />
          <Showcase
            title={t("Find out if Fridays really are that empty")}
            lead={t(
              "How full the office gets, the busiest day, every floor and every desk — how often those permanent desks sit unused, and whether teams really turn up on their team days."
            )}
            points={[t("Look back or plan ahead"), t("CSV for the spreadsheet fans")]}
            picture={
              <Picture
                src={PICTURES.insights}
                isPanel
                alt={t(
                  "Insights: 72% full, Wednesday the busiest day, desks in use per week, a heatmap of every working day and how each team turns up"
                )}
              />
            }
          />
          <Showcase
            title={t("Build your office in an afternoon")}
            lead={t(
              "Start from a template or draw your own. Rooms measure themselves, desks number themselves, and everything saves as you go. Moving the sofa has never been easier."
            )}
            points={[t("Walls, doors, windows and furniture"), t("As many floors as you've got")]}
            picture={
              <Picture
                src={PICTURES.editor}
                alt={t(
                  "The office editor: furniture to pick from beside the office in 3D, its rooms measured and its teams' zones named on the floor"
                )}
              />
            }
            isFlipped
          />
        </div>

        <section id="how" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading title={t("Up and running in three steps")} />
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              <Step number={1} title={t("Create your company")}>
                {t("Sign in with Google or GitHub and give it a name.")}
              </Step>
              <Step number={2} title={t("Draw your office")}>
                {t("Use a template or sketch your own. Add floors whenever.")}
              </Step>
              <Step number={3} title={t("Invite your people")}>
                {t("Send a link. They join, book a desk, and that's it. No training needed.")}
              </Step>
            </ol>
          </div>
        </section>

        <section id="questions" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <SectionHeading title={t("Questions people ask")} />
          <dl className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2">
            <Question title={t("Who can see where I sit?")}>
              {t(
                "Only people in your company. Hotseat is invite-only, so the rest of the internet won't know you sit by the window."
              )}
            </Question>
            <Question title={t("How do people sign in?")}>
              {t("With Google or GitHub. No new password to forget.")}
            </Question>
            <Question title={t("Is there an app?")}>
              {t(
                "It's a website that works properly on phones. No app store, no updates — pop it on your home screen and you're set."
              )}
            </Question>
            <Question title={t("How big can our office be?")}>
              {t(
                "Pretty big. As many offices as you like, up to 20 floors each, and as many desks as fit."
              )}
            </Question>
            <Question title={t("Do we have to draw the office first?")}>
              {t(
                "Pick a template and people can book in minutes. Make it look like your real office whenever you get round to it."
              )}
            </Question>
            <Question title={t("Is it in Czech?")}>
              {t(
                "Ano! Czech and English, picked from your browser. Switch any time at the bottom of the page."
              )}
            </Question>
            <Question title={t("Where is our data kept?")}>
              {t(
                "The app runs on Cloudflare and your bookings live in a Postgres database at Neon."
              )}
            </Question>
            <Question title={t("Can we run it on our own servers?")}>
              <Rich
                text={t(
                  "Yes. One Docker image, your own database and your own sign-in — Microsoft, Google Workspace, Okta and friends. The {guide} walks you through it."
                )}
                values={{
                  guide: (
                    <Link
                      to="/docs/self-hosting"
                      className="font-bold text-[#f6c560] hover:underline"
                    >
                      {t("self-hosting guide")}
                    </Link>
                  ),
                }}
              />
            </Question>
            <Question title={t("Can we try it before we commit?")}>
              {t(
                "Sure. Look around the demo office without an account — book a desk, find a seat, move the furniture. Or set up your own and invite a few people first."
              )}
            </Question>
          </dl>
        </section>

        <section className="px-4 pt-12 sm:px-6">
          <div
            className={clsx(
              CARD,
              "relative mx-auto flex max-w-6xl flex-col items-center overflow-hidden rounded-[calc(var(--radius)*6)] px-6 py-16 text-center"
            )}
          >
            <h2 className="relative max-w-2xl text-3xl font-black tracking-[-0.01em] sm:text-4xl">
              {t("Ready when you are")}
            </h2>
            <p className={clsx("relative mt-4 max-w-xl text-lg", QUIET_TEXT)}>
              {t("Set up your office today. Your people can book a desk the minute they join.")}
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/login" className={PRIMARY_LINK}>
                {t("Get started")}
              </Link>
              <DemoButton className={SECONDARY_LINK} />
            </div>
          </div>
        </section>

        {/* The page ends on the horizon it opened with. */}
        <div className="mt-16">
          <Horizon isAnimated={isAnimated} isWhole />
        </div>
      </main>

      <ProductFooter />
    </div>
  )
}

/**
 * "Look around a demo office": a POST (crawlers never start one) that makes
 * the visitor their own copy of the demo company and signs them in to it.
 */
const DemoButton = ({ className }: { className: string }) => {
  const { t } = useI18n()
  const navigation = useNavigation()
  const isStarting = navigation.formAction === "/demo"

  return (
    <Form method="post" action="/demo">
      <button type="submit" disabled={isStarting} className={clsx(className, "min-w-56")}>
        {isStarting ? t("Setting up…") : t("Look around a demo office")}
      </button>
    </Form>
  )
}

/** The front page's sections (on the front page itself, the browser just scrolls there). */
const HOME = import.meta.env.BASE_URL

/** The marketing pages' header: the product page's, and the self-hosting guide's. */
export const ProductHeader = () => {
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-20 border-b border-[#f4efe6]/10 bg-[#1f2850]/95 text-[#f4efe6] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          to="/"
          aria-label="Hotseat"
          className="rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-[#f6c560]"
        >
          <HotseatLockup size={30} />
        </Link>
        <nav aria-label={t("Product")} className="ml-4 hidden gap-1 md:flex">
          <a
            href={`${HOME}#features`}
            className="rounded-full px-3 py-2 text-sm font-bold text-[#9aa1c0] hover:text-[#f4efe6]"
          >
            {t("What it does")}
          </a>
          <a
            href={`${HOME}#how`}
            className="rounded-full px-3 py-2 text-sm font-bold text-[#9aa1c0] hover:text-[#f4efe6]"
          >
            {t("How it works")}
          </a>
          <a
            href={`${HOME}#questions`}
            className="rounded-full px-3 py-2 text-sm font-bold text-[#9aa1c0] hover:text-[#f4efe6]"
          >
            {t("Questions")}
          </a>
          <Link
            to="/docs/self-hosting"
            prefetch="intent"
            className="rounded-full px-3 py-2 text-sm font-bold text-[#9aa1c0] hover:text-[#f4efe6]"
          >
            {t("Self-hosting")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {/* One way in (signing in creates an account): "Get started" is the page's own. */}
          <Link to="/login" className={clsx(PRIMARY_LINK, "min-h-10 px-5 text-sm")}>
            {t("Sign in")}
          </Link>
        </div>
      </div>
    </header>
  )
}

/** The marketing pages' footer: language, the self-hosting guide, signing in. */
export const ProductFooter = () => {
  const { t } = useI18n()
  const [locale, pickLocale] = useLocale()

  return (
    <footer className="border-t border-[#f4efe6]/10 text-[#f4efe6]" style={{ background: NIGHT }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-8 sm:px-6">
        <HotseatLockup size={22} />
        <p className={clsx("text-sm", FAINT_TEXT)}>© {new Date().getFullYear()} Hotseat</p>
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
                  ? "bg-[#26305c] text-[#f4efe6]"
                  : clsx(FAINT_TEXT, "hover:text-[#f4efe6]")
              )}
            >
              {LOCALE_NAMES[option]}
            </button>
          ))}
          <Link
            to="/docs/self-hosting"
            className={clsx("ml-2 min-h-9 rounded-full px-3 py-2 hover:text-[#f4efe6]", FAINT_TEXT)}
          >
            {t("Self-hosting")}
          </Link>
          <Link
            to="/login"
            className={clsx("min-h-9 rounded-full px-3 py-2 hover:text-[#f4efe6]", FAINT_TEXT)}
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
  isPanel = false,
}: {
  src: string
  alt: string
  className?: string
  /** The first picture on the page: loaded at once, not when scrolled to. */
  isEager?: boolean
  /** One of the app's panels, cut at its own edge: its corners, not the page's. */
  isPanel?: boolean
}) => (
  <div
    className={clsx(
      "w-full overflow-hidden shadow-[0_30px_60px_-20px_rgba(8,12,30,0.7),0_0_0_1px_rgba(244,239,230,0.08)]",
      isPanel ? "rounded-2xl" : "rounded-[calc(var(--radius)*4)]",
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
      <p className={clsx("mt-4 text-lg leading-relaxed", QUIET_TEXT)}>{lead}</p>
      <ul className="mt-6 flex flex-col gap-2.5">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-2.5 font-bold">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#f6c560]/15 text-[#f6c560]">
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
    {lead && <p className={clsx("mt-3 text-lg", QUIET_TEXT)}>{lead}</p>}
  </div>
)

const Feature = ({
  icon: Icon,
  color,
  title,
  children,
}: {
  icon: LucideIcon
  /** One of the horizon's lines. */
  color: string
  title: string
  children: ReactNode
}) => (
  <li className={clsx(CARD, "p-6")}>
    <span className="grid size-11 place-items-center rounded-xl bg-[#f4efe6]/8" style={{ color }}>
      <Icon className="size-5" />
    </span>
    <h3 className="mt-4 text-lg font-black">{title}</h3>
    <p className={clsx("mt-1.5 leading-relaxed", QUIET_TEXT)}>{children}</p>
  </li>
)

const Question = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <dt className="text-lg font-black">{title}</dt>
    <dd className={clsx("mt-1.5 leading-relaxed", QUIET_TEXT)}>{children}</dd>
  </div>
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
  <li className={clsx(CARD, "p-6")}>
    <span className="grid size-10 place-items-center rounded-full bg-[#fbf6ee] text-base font-black text-[#2c3866]">
      {number}
    </span>
    <h3 className="mt-4 text-lg font-black">{title}</h3>
    <p className={clsx("mt-1.5 leading-relaxed", QUIET_TEXT)}>{children}</p>
  </li>
)
