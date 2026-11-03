# Development

```sh
curl -fsSL https://bun.sh/install | bash
bun install
bun run db:start
bun run prisma:generate
bun run prisma:migrate
bun run dev
```

## Tests

```sh
bun run test   # unit tests
bun run e2e    # end-to-end, in Chrome: builds and serves the production app
```

The end-to-end tests (`e2e/`) drive the production build, as it's released,
on a desktop and a phone, signed out and signed in: each test worker starts its
own copy of the demo company and deletes it afterwards. They need the local
database (`bun run db:start`) and Chrome installed. Run them before a release;
a failure leaves a screenshot and a trace in `e2e/results/`
(`npx playwright show-trace <trace.zip>`).

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

# Self-hosting

One company's own installation, on a plain Node server with Docker: the
guide is in [docs/self-hosting](docs/self-hosting/README.md) (quick start:
[SELF_HOSTING.md](SELF_HOSTING.md)).

## Releasing the self-hosted image

Set the new version in `package.json`, in `HOTSEAT_VERSION` in
`self-hosting/.env.example`, and in the download commands of
`docs/self-hosting/installation.md` and `SELF_HOSTING.md`. Commit, then tag
and push:

```sh
git tag v0.6.1-alpha && git push origin v0.6.1-alpha
```

`.github/workflows/release.yml` runs the checks, publishes
`ghcr.io/hotseat-org/hotseat` for amd64 and arm64 (tags: the version, plus
`alpha`/`beta`/`rc` for pre-releases, or `latest` and `0.5` for releases),
and creates the GitHub Release with notes from the commits. Every pull request
and push to `main` runs the same checks and a test build (`check.yml`).

# License

[Functional Source License 1.1, Apache 2.0 future license](LICENSE.md)
(`FSL-1.1-ALv2`): use it for anything but a product or service that competes
with Hotseat, including running it for your own company. Each version
becomes Apache 2.0 two years after it's released. Third-party assets: see
[CREDITS.md](CREDITS.md).
