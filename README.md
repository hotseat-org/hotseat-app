# Development

```sh
curl -fsSL https://bun.sh/install | bash
bun install
bun run db:start
bun run prisma:generate
bun run prisma:migrate
bun run dev
```

# Deployment

Runs as a Cloudflare Worker at https://alpha.vidlak.net/hotseat (route + config in
`wrangler.jsonc`). Postgres is on Neon, reached through Hyperdrive (`HYPERDRIVE` binding).

```sh
bun run deploy                         # build + wrangler deploy
DATABASE_URL=<neon-direct-url> bunx prisma migrate deploy --config=./app/repositories/main-repository/prisma/prisma.config.ts
bunx wrangler secret put <NAME>        # COOKIES_SECRET, GOOGLE_*, GITHUB_*, CLOUDFLARE_*
```

Locally, `bun run dev` runs the app in workerd too; Hyperdrive falls back to the
`localConnectionString` (the docker Postgres) and secrets come from `.env`.
