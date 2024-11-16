import { createCookie } from "@vercel/remix"
import dayjs from "dayjs"
import duration from "dayjs/plugin/duration.js"

dayjs.extend(duration)

export const returnToPage = createCookie("lastPage", {
  maxAge: 60,
  sameSite: "lax",
  path: "/",
  httpOnly: true,
  secrets: [process.env.COOKIES_SECRET ?? ""],
  secure: process.env.NODE_ENV === "production",
})

export const sessionCookie = createCookie("session", {
  maxAge: dayjs.duration({ weeks: 1 }).asSeconds(),
  sameSite: "lax",
  path: "/",
  httpOnly: true,
  secrets: [process.env.COOKIES_SECRET ?? ""],
  secure: process.env.NODE_ENV === "production",
})

export const themeCookie = createCookie("theme", {
  sameSite: "lax",
  path: "/",
  httpOnly: true,
  secrets: [process.env.COOKIES_SECRET ?? ""],
  secure: process.env.NODE_ENV === "production",
})
