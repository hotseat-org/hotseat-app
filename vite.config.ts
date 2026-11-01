import { cloudflare } from "@cloudflare/vite-plugin"
import { reactRouter } from "@react-router/dev/vite"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import tailwind from "@tailwindcss/vite"
import devtoolsJson from "vite-plugin-devtools-json"

export default defineConfig({
  base: "/hotseat/",
  server: {
    port: 3000,
    allowedHosts: ["hotseat.vidlak.net"],
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
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
  },
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
