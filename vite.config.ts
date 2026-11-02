import { fileURLToPath } from "node:url"
import { cloudflare } from "@cloudflare/vite-plugin"
import { reactRouter } from "@react-router/dev/vite"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import tailwind from "@tailwindcss/vite"
import devtoolsJson from "vite-plugin-devtools-json"

/**
 * Two builds: the hosted one on Cloudflare (the default), and a plain Node
 * server for self-hosting (HOTSEAT_TARGET=node; server/app.ts, served by
 * server/node.mjs) — with the Node flavour of the Prisma client. BASE_PATH:
 * where it's served ("/hotseat/" hosted; a self-hosted one usually "/").
 */
const isNodeTarget = process.env.HOTSEAT_TARGET === "node"
const BASE_PATH = process.env.BASE_PATH ?? "/hotseat/"
const NODE_PRISMA_CLIENT = fileURLToPath(
  new URL(
    "./app/repositories/main-repository/prisma/generated/prisma-client-node/",
    import.meta.url
  )
)

/**
 * What the Node server loads from node_modules rather than its bundle:
 * Prisma's client runtime (it loads its query compiler from its own files),
 * the Postgres driver (server/migrate.mjs uses it too), and workers-og (Cloudflare-only: loaded lazily, and
 * missing on Node on purpose). The Docker image installs just these (see
 * scripts/runtime-packages.mjs).
 */
const NODE_RUNTIME_PACKAGES = ["@prisma/client", "@prisma/adapter-pg", "pg", "workers-og"]

export default defineConfig({
  base: BASE_PATH,
  // Changes with every build: what the browser keeps between visits (the
  // catalog's stills) is kept per build, so a new one never shows stale models.
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  server: {
    port: 3000,
    allowedHosts: ["hotseat.vidlak.net"],
  },
  plugins: [
    ...(isNodeTarget ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
    reactRouter(),
    tsconfigPaths(),
    tailwind(),
    devtoolsJson(),
  ],
  // Ensure a single React instance across the app and the lazily-loaded R3F
  // editor. Without this, Vite can pre-bundle zustand/three against a second
  // React copy at dev time, nulling React's hook dispatcher and crashing with
  // "Cannot read properties of null (reading 'useSyncExternalStore')".
  resolve: {
    dedupe: ["react", "react-dom", "three"],
    alias: isNodeTarget
      ? [
          {
            find: /^~\/repositories\/main-repository\/prisma\/generated\/prisma-client\//,
            replacement: NODE_PRISMA_CLIENT,
          },
        ]
      : [],
  },
  // The Node server's entry: the app's handler and hourly jobs (see server/app.ts).
  // Its packages are bundled in (only what it uses — the image then needs just
  // NODE_RUNTIME_PACKAGES installed), but for those that can't be.
  ...(isNodeTarget && {
    environments: {
      ssr: {
        resolve: { noExternal: true, external: NODE_RUNTIME_PACKAGES },
        build: { rollupOptions: { input: "./server/app.ts" } },
      },
    },
  }),
  optimizeDeps: {
    // Pre-bundle everything the (lazily-loaded) editor and its route pull in.
    // Otherwise Vite discovers them on first editor load, re-optimizes, and
    // force-reloads the page — which can abort the in-flight dynamic import of
    // the editor chunk and leave a blank canvas.
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "zustand",
      "zustand/middleware",
      "nanoid",
      "lucide-react",
      // three's entry points and the examples used, in one pass: they share
      // one copy of three's core (two copies break the WebGPU renderer).
      "three",
      "three/webgpu",
      "three/tsl",
      "three/examples/jsm/tsl/display/GTAONode.js",
      "three/examples/jsm/tsl/display/DenoiseNode.js",
      "three/examples/jsm/geometries/RoundedBoxGeometry.js",
      "three/examples/jsm/utils/BufferGeometryUtils.js",
      "@react-three/fiber",
      "@react-three/drei",
      "remix-themes",
      "remix-utils/client-only",
      "clsx",
      "dayjs",
      "dayjs/plugin/duration.js",
    ],
  },
})
