import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end tests (e2e/): the app as people use it, in a real browser —
 * against the production build, as it's released (the dev server's React
 * StrictMode mounts things twice, which both hides and causes bugs that
 * production doesn't have). Signed in, each test worker gets its own copy of
 * the demo company, deleted afterwards: no account or data of anyone's.
 * Needs the local database (`bun run db:start`) and Chrome installed.
 */
const PORT = 4173

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/results",
  // Each worker starts a demo company (hundreds of bookings): a couple at a time.
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}/hotseat/`,
    // The installed Chrome (WebGPU, no browser download), never a window.
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1440, height: 900 } },
      testIgnore: /\.phone\.spec\.ts$/,
    },
    {
      name: "phone",
      use: { ...devices["iPhone 14"], defaultBrowserType: "chromium", channel: "chrome" },
      testMatch: /(pages|\.phone)\.spec\.ts$/,
    },
  ],
  webServer: {
    command: `bun run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/hotseat/login`,
    reuseExistingServer: true,
    timeout: 240_000,
  },
})
