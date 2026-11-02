import type { Config } from "@react-router/dev/config"

export default {
  ssr: true,
  // Served at alpha.vidlak.net/hotseat (a Worker route on the shared host);
  // a self-hosted build wherever BASE_PATH says (see vite.config.ts).
  basename: process.env.BASE_PATH ?? "/hotseat/",
} satisfies Config
