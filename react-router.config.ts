import type { Config } from "@react-router/dev/config"

export default {
  ssr: true,
  // Served at alpha.vidlak.net/hotseat (a Worker route on the shared host)
  basename: "/hotseat/",
} satisfies Config
