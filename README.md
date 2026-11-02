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
bun run prisma:migrate:production      # pending migrations → the production database (first)
bun run deploy                         # build + wrangler deploy
bunx wrangler secret put <NAME>        # COOKIES_SECRET, GOOGLE_*, GITHUB_*, CLOUDFLARE_*
```

`prisma:migrate:production` asks Neon for the production database's connection string
(`neonctl connection-string`, the direct one, as migrations need; neonctl logs in on first
use) and runs `prisma migrate deploy` with it.

Locally, `bun run dev` runs the app in workerd too; Hyperdrive falls back to the
`localConnectionString` (the docker Postgres) and secrets come from `.env`.
