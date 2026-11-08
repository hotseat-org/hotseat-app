import { Button, Spinner } from "@heroui/react"
import clsx from "clsx"
import { Download, Map as MapIcon } from "lucide-react"
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useFetcher, useParams } from "react-router"
import { useTheme } from "remix-themes"
import { DialogCloseButton } from "~/components/ui/DialogCloseButton"
import { heatColor, heatGradient, PERIOD_LABEL } from "~/office/heatmap/heatmap"
import { personByEmail, usePeople } from "~/office/desks/people"
import { useOfficeStore } from "~/office/store"
import { useOfficePanel } from "~/office/useOfficePanel"
import { floorText } from "~/office/booking/useBooking"
import type { InsightsPeriod, OfficeInsights, TeamInsights } from "~/core/office/insights"
import { TeamDot } from "~/components/teams/teamLook"
import { getTeamHex } from "~/utils/teams"
import type { InsightsData } from "~/routes/api.insights.$slug.$officeSlug"
import { addDays, weekStart, type Day } from "~/utils/booking"
import { useI18n } from "~/i18n/I18nProvider"
import type { Translator } from "~/i18n/translate"

/** The two series (validated colour-blind safe, light and dark). */
const SERIES = {
  light: { booked: "#4a6fae", permanent: "#c08436" },
  dark: { booked: "#6b8fd6", permanent: "#b97d35" },
}
/** A Monday, to name weekdays by (ISO 1 = Monday … 5 = Friday). */
const A_MONDAY: Day = "2024-01-01"
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** A hover tooltip over a chart: follows the mark, text in ink colours. */
type Tip = { x: number; y: number; title: string; lines: string[] } | null
const Tooltip = ({ tip }: { tip: Tip }) =>
  tip && (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-overlay px-2.5 py-1.5 text-xs whitespace-nowrap shadow-overlay"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <p className="font-bold text-foreground">{tip.title}</p>
      {tip.lines.map((l) => (
        <p key={l} className="text-muted">
          {l}
        </p>
      ))}
    </div>
  )

const Card = ({
  title,
  aside,
  children,
  className,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) => (
  <figure
    className={clsx("relative m-0 rounded-2xl border border-border bg-surface p-4", className)}
  >
    <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-sm font-extrabold text-foreground">{title}</span>
      {aside}
    </figcaption>
    {children}
  </figure>
)

const Stat = ({ label, value, detail }: { label: string; value: ReactNode; detail: ReactNode }) => (
  <div className="rounded-2xl bg-surface-secondary p-4">
    <p className="text-xs font-extrabold text-muted">{label}</p>
    <p className="mt-1 text-[30px] font-black leading-none text-foreground">{value}</p>
    <p className="mt-1.5 text-xs text-muted">{detail}</p>
  </div>
)

/** Desks in use per week (average working day): booked + permanent, against the desks. */
const WeeksChart = ({ data, isDark }: { data: OfficeInsights; isDark: boolean }) => {
  const { t, format } = useI18n()
  const [tip, setTip] = useState<Tip>(null)
  const colors = SERIES[isDark ? "dark" : "light"]
  const W = 620
  const H = 190
  const top = 18
  const base = 168
  const y = (n: number) => base - (n / Math.max(1, data.deskCount)) * (base - top)
  const slot = (W - 30) / Math.max(1, data.byWeek.length)
  const bar = Math.min(46, slot * 0.62)
  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      <svg
        role="img"
        aria-label={t("Desks in use per week, of {n}", { n: data.deskCount })}
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
      >
        <line
          x1="30"
          x2={W}
          y1={y(data.deskCount)}
          y2={y(data.deskCount)}
          className="stroke-muted"
          strokeWidth={1.5}
          strokeDasharray="5 5"
        />
        <line x1="30" x2={W} y1={base} y2={base} className="stroke-separator" />
        <text x="24" y={base + 4} textAnchor="end" className="fill-muted text-[10px]">
          0
        </text>
        <text x="24" y={y(data.deskCount) + 4} textAnchor="end" className="fill-muted text-[10px]">
          {data.deskCount}
        </text>
        {data.byWeek.map((w, i) => {
          const x = 30 + i * slot + (slot - bar) / 2
          const permanentTop = y(w.permanent)
          const bookedTop = y(w.permanent + w.booked)
          return (
            <g
              key={w.start}
              onMouseEnter={(e) => {
                const box = (
                  e.currentTarget.ownerSVGElement as SVGSVGElement
                ).getBoundingClientRect()
                setTip({
                  x: ((x + bar / 2) / W) * box.width,
                  y: (bookedTop / H) * box.height,
                  title: t("Week of {day}", { day: { day: w.start } }),
                  lines: [
                    t("{booked} booked + {permanent} permanent", {
                      booked: w.booked,
                      permanent: w.permanent,
                    }),
                    t("of {n} desks, an average day", { n: data.deskCount }),
                  ],
                })
              }}
            >
              {/* A bigger hit target than the bar. */}
              <rect x={30 + i * slot} y={top} width={slot} height={base - top} fill="transparent" />
              <rect
                x={x}
                y={permanentTop}
                width={bar}
                height={base - permanentTop}
                fill={colors.permanent}
              />
              {w.booked > 0 && (
                <path
                  d={`M${x} ${permanentTop - 2}V${bookedTop + 4}a4 4 0 0 1 4-4h${bar - 8}a4 4 0 0 1 4 4V${permanentTop - 2}Z`}
                  fill={colors.booked}
                />
              )}
              {(i === 0 || i === data.byWeek.length - 1 || data.byWeek.length <= 4) && (
                <text
                  x={x + bar / 2}
                  y={H - 4}
                  textAnchor="middle"
                  className="fill-muted text-[10px]"
                >
                  {format.short(w.start)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
}

/** Every working day: a cell per day (Mon–Fri rows, week columns), full days outlined. */
const DaysChart = ({ data, isDark }: { data: OfficeInsights; isDark: boolean }) => {
  const { t, format } = useI18n()
  const [tip, setTip] = useState<Tip>(null)
  const weeks = [...new Set(data.days.map((d) => weekStart(d.date)))]
  const cell = new Map(data.days.map((d) => [d.date, d]))
  return (
    <div data-chart className="relative" onMouseLeave={() => setTip(null)}>
      <div
        className="grid items-center gap-[3px] text-[10px] text-muted"
        style={{ gridTemplateColumns: `34px repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {[0, 1, 2, 3, 4].map((row) => (
          <Fragment key={row}>
            <span>{format.weekShort()[row]}</span>
            {weeks.map((start) => {
              const date = addDays(start, row)
              const d = cell.get(date)
              if (!d) return <span key={date} />
              return (
                <span
                  key={date}
                  className="h-[18px] rounded-[4px]"
                  style={{
                    background: heatColor(d.ratio, isDark),
                    outline: d.isFull ? "2px solid var(--foreground)" : undefined,
                  }}
                  onMouseEnter={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    const box = (
                      e.currentTarget.closest("[data-chart]") as HTMLElement
                    ).getBoundingClientRect()
                    setTip({
                      x: r.left - box.left + r.width / 2,
                      y: r.top - box.top,
                      title: format.long(d.date),
                      lines: [
                        t("{n} of {total} desks ({percent})", {
                          n: d.booked + d.permanent,
                          total: data.deskCount,
                          percent: format.percent(d.ratio),
                        }),
                        ...(d.waiting
                          ? [t("{n} waiting", { n: d.waiting })]
                          : d.isFull
                            ? [t("Full")]
                            : []),
                      ],
                    })
                  }}
                />
              )
            })}
          </Fragment>
        ))}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span>{t("Quiet")}</span>
        <span
          aria-hidden
          className="h-2 w-28 rounded-full"
          style={{ background: heatGradient(isDark) }}
        />
        <span>{t("Busy")}</span>
        <span className="ml-2 inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-[3px]"
            style={{ outline: "2px solid var(--foreground)" }}
          />
          {t("Full")}
        </span>
      </p>
      <Tooltip tip={tip} />
    </div>
  )
}
/** The days as CSV (for a spreadsheet). */
const downloadCsv = ({ t }: Translator, data: OfficeInsights, officeSlug: string) => {
  const rows = [
    [t("date"), t("booked"), t("permanent"), t("in use %"), t("full"), t("waiting")],
    ...data.days.map((d) => [
      d.date,
      d.booked,
      d.permanent,
      Math.round(d.ratio * 100),
      d.isFull ? t("yes") : t("no"),
      d.waiting,
    ]),
  ]
  const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `${officeSlug}-${data.from}-${data.to}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

/**
 * Insights (admins): how the office is used — the last 4 or 12 weeks, or
 * what's booked for the next two. "Show on the office" lays the desks' usage
 * over the office itself as a heatmap.
 */
/**
 * Teams: how much of each comes in on an average day, how often most of it is
 * in together, whether its team days work, and how its zone is used.
 */
const TeamsCard = ({ teams }: { teams: TeamInsights[] }) => {
  const { t, tn, format } = useI18n()

  return (
    <Card title={t("Teams")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr className="text-left text-[11px] text-muted">
              <th className="py-1 font-extrabold">{t("Team")}</th>
              <th className="font-extrabold">{t("In, an average day")}</th>
              <th className="font-extrabold">{t("Together")}</th>
              <th className="font-extrabold">{t("Team days")}</th>
              <th className="font-extrabold">{t("Their zone")}</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-t border-separator align-top">
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-2 font-bold">
                    <TeamDot color={team.color} />
                    {team.name}
                  </span>
                  <span className="pl-[18px] text-muted">
                    {tn(team.memberCount, "{n} person", "{n} people")}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-2 rounded-full"
                      style={{
                        width: Math.max(3, team.presence * 90),
                        background: getTeamHex(team.color),
                      }}
                    />
                    <b>{format.percent(team.presence)}</b>
                  </span>
                </td>
                <td className="py-2 pr-3">
                  {tn(team.togetherDays, "{n} day", "{n} days")}
                  <span className="block text-muted">{t("most of it in")}</span>
                </td>
                <td className="py-2 pr-3">
                  {team.onTeamDays ? (
                    <>
                      <b>{format.percent(team.onTeamDays.teamDays)}</b>
                      <span className="text-muted">
                        {" "}
                        {t("vs {percent} other days", {
                          percent: format.percent(team.onTeamDays.otherDays),
                        })}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">{t("None set")}</span>
                  )}
                </td>
                <td className="py-2">
                  {team.zone ? (
                    <>
                      <b>{team.zone.name}</b>{" "}
                      <span className="text-muted">
                        {t("{percent} full", { percent: format.percent(team.zone.ratio) })}
                      </span>
                      <span className="block text-muted">
                        {t("{share} of it the team's · {there} of their days there", {
                          share: format.percent(team.zone.teamShare),
                          there: format.percent(team.zone.sitsThere),
                        })}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">{t("No zone here")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export const InsightsDashboard = () => {
  const { slug, officeSlug } = useParams()
  const i18n = useI18n()
  const { t, tn, format } = i18n
  const { close } = useOfficePanel()
  const setHeatmap = useOfficeStore((s) => s.setHeatmap)
  const heatmap = useOfficeStore((s) => s.heatmap)
  const people = usePeople()
  const [theme] = useTheme()
  const isDark = theme === "dark"
  const colors = SERIES[isDark ? "dark" : "light"]
  const [period, setPeriod] = useState<InsightsPeriod>(heatmap?.period ?? "4w")
  const insights = useFetcher<InsightsData>()
  const load = insights.load
  useEffect(() => {
    load(`/api/insights/${slug}/${officeSlug}?period=${period}`)
  }, [load, slug, officeSlug, period])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [close])

  const data = insights.data && !("error" in insights.data) ? insights.data : null
  const isCurrent = data?.period === period
  const nameOf = (email: string) => personByEmail(people, email)?.name ?? email
  const busiest = useMemo(
    () => (data ? [...data.byWeekday].sort((a, b) => b.ratio - a.ratio)[0] : null),
    [data]
  )
  const delta =
    data && data.previousOccupancy !== null
      ? Math.round((data.occupancy - data.previousOccupancy) * 100)
      : null

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto p-4 md:p-8">
      <button
        type="button"
        aria-label={t("Close insights")}
        className="fixed inset-0 bg-scrim"
        onClick={close}
      />
      <section
        aria-label={t("Insights")}
        className="modal-in relative flex h-fit w-full max-w-[1220px] flex-col gap-5 rounded-[calc(var(--radius)*3)] bg-overlay p-5 text-foreground shadow-overlay md:p-7"
      >
        <header className="flex flex-wrap items-center gap-3">
          <div className="min-w-60 flex-1">
            <h2 className="text-[44px] leading-[0.95] font-black tracking-[-0.03em]">
              {t("Insights")}
            </h2>
            <p className="text-sm text-muted">
              {data
                ? `${tn(data.deskCount, "{n} desk", "{n} desks")} · ${format.long(data.days[0]?.date ?? data.from)} – ${format.long(data.days[data.days.length - 1]?.date ?? data.to)} · ${t("working days")}`
                : t("Loading…")}
            </p>
          </div>
          <div
            role="tablist"
            aria-label={t("Period")}
            className="flex gap-0.5 rounded-full bg-segment p-[3px]"
          >
            {(["4w", "12w", "next"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={period === p}
                onClick={() => setPeriod(p)}
                className={clsx(
                  "h-8 rounded-full px-3.5 text-[13px] font-extrabold transition-colors",
                  period === p
                    ? "bg-overlay text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                )}
              >
                {t(PERIOD_LABEL[p])}
              </button>
            ))}
          </div>
          <Button
            variant="primary"
            size="sm"
            isDisabled={!data || !isCurrent}
            onPress={() => {
              if (!data) return
              setHeatmap({
                period,
                ratios: Object.fromEntries(data.desks.map((d) => [d.deskId, d.ratio])),
              })
              close()
            }}
          >
            <MapIcon className="size-4" /> {t("Show on the office")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={!data}
            onPress={() => data && downloadCsv(i18n, data, officeSlug ?? "office")}
          >
            <Download className="size-4" /> CSV
          </Button>
          <DialogCloseButton onClose={close} />
        </header>

        {insights.data && "error" in insights.data && (
          <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{insights.data.error}</p>
        )}

        {!data ? (
          <div className="grid h-[560px] place-items-center">
            <Spinner />
          </div>
        ) : (
          <div
            className={clsx("flex flex-col gap-4 transition-opacity", !isCurrent && "opacity-50")}
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                label={period === "next" ? t("Booked so far") : t("Occupancy")}
                value={format.percent(data.occupancy)}
                detail={
                  delta === null
                    ? t("of desks in use, an average day")
                    : t("{arrow} {n} pts vs the {weeks} weeks before", {
                        arrow: delta >= 0 ? "▲" : "▼",
                        n: Math.abs(delta),
                        weeks: period === "12w" ? 12 : 4,
                      })
                }
              />
              <Stat
                label={t("Busiest weekday")}
                value={
                  busiest ? capitalize(format.weekday(addDays(A_MONDAY, busiest.weekday - 1))) : "—"
                }
                detail={
                  busiest
                    ? t("{percent} on average", { percent: format.percent(busiest.ratio) })
                    : ""
                }
              />
              <Stat
                label={period === "next" ? t("People booked") : t("People who came in")}
                value={
                  <>
                    {data.people.came}
                    <span className="text-base text-muted">
                      {" "}
                      {t("of {total}", { total: data.memberCount })}
                    </span>
                  </>
                }
                detail={t("{n} days a week each", { n: data.people.daysPerWeek })}
              />
              <Stat
                label={t("Full days")}
                value={data.fullDays}
                detail={
                  period === "next"
                    ? tn(
                        data.days.reduce((n, d) => n + d.waiting, 0),
                        "{n} person waiting now",
                        "{n} people waiting now"
                      )
                    : t("every desk in use")
                }
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
              <Card
                title={t("Desks in use, an average day per week")}
                aside={
                  <span className="flex gap-3.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="size-2.5 rounded-[3px]"
                        style={{ background: colors.booked }}
                      />
                      {t("Booked")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="size-2.5 rounded-[3px]"
                        style={{ background: colors.permanent }}
                      />
                      {t("Permanent")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3.5 border-t-2 border-dashed border-muted" />
                      {tn(data.deskCount, "{n} desk", "{n} desks")}
                    </span>
                  </span>
                }
              >
                <WeeksChart data={data} isDark={isDark} />
              </Card>
              <Card title={t("Every working day")}>
                <DaysChart data={data} isDark={isDark} />
              </Card>
            </div>

            {/* With floors: how much each is in use. */}
            {data.byFloor.length > 0 && (
              <Card title={t("By floor, an average working day")}>
                <ul className="flex flex-col gap-2">
                  {[...data.byFloor].reverse().map(({ floor, deskCount, ratio }) => (
                    <li
                      key={floor.number}
                      className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3 text-[13px]"
                    >
                      <span className="truncate font-bold">{floorText(i18n, floor)}</span>
                      <span className="h-2.5 overflow-hidden rounded-full bg-surface-secondary">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.round(ratio * 100)}%`,
                            background: colors.booked,
                          }}
                        />
                      </span>
                      <span className="whitespace-nowrap text-muted">
                        <span className="font-bold text-foreground">{format.percent(ratio)}</span>
                        {" · "}
                        {tn(deskCount, "{n} desk", "{n} desks")}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {data.teams.length > 0 && <TeamsCard teams={data.teams} />}

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title={t("Desks")}>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="text-left text-[11px] text-muted">
                        <th className="py-1 font-extrabold">{t("Desk")}</th>
                        <th className="font-extrabold">{t("In use")}</th>
                        <th className="text-right font-extrabold">{t("Last used")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.desks.map((d) => (
                        <tr key={d.deskId} className="border-t border-separator">
                          <td className="py-1.5 font-bold">
                            {d.label ?? t("Desk")}
                            {d.floor && (
                              <span className="font-normal text-muted">
                                {" "}
                                · {floorText(i18n, d.floor)}
                              </span>
                            )}
                            {d.resident && (
                              <span className="font-normal text-muted">
                                {" "}
                                · {nameOf(d.resident)}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="inline-block h-2 rounded-full"
                                style={{
                                  width: Math.max(3, d.ratio * 90),
                                  background: colors.booked,
                                }}
                              />
                              {d.ratio === 0 ? (
                                <span className="text-muted">{t("never")}</span>
                              ) : (
                                format.percent(d.ratio)
                              )}
                            </span>
                          </td>
                          <td className="text-right text-muted">
                            {d.lastUsed ? format.short(d.lastUsed) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Card title={t("Permanent desks")}>
                {data.permanent.length ? (
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="text-left text-[11px] text-muted">
                        <th className="py-1 font-extrabold">{t("Desk")}</th>
                        <th className="font-extrabold">{t("Resident")}</th>
                        <th className="text-right font-extrabold">{t("Given up")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.permanent.map((d) => (
                        <tr key={d.deskId} className="border-t border-separator">
                          <td className="py-1.5 font-bold">{d.label ?? t("Desk")}</td>
                          <td>{nameOf(d.resident)}</td>
                          <td className="text-right">
                            {t("{n} of {total} days", { n: d.givenUp, total: data.days.length })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted">{t("No permanent desks here.")}</p>
                )}
              </Card>
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body
  )
}
