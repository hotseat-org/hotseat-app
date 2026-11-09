# Operations

Keeping a self-hosted Hotseat running: backups, updates, logs, and what to
do when something's off. Commands run in the folder with your `compose.yml`
and `.env`.

## Backups

Two things hold your data:

| What | Where | Holds |
| --- | --- | --- |
| The database | the `database` volume, or [your own Postgres](configuration.md#database) | Everything but images: the company, people, offices and layouts, bookings. |
| Images | the `images` volume (`/data/images`), or [your Cloudflare Images](configuration.md#images) | Logos, office covers, people's photos. |

With your own Postgres or Cloudflare Images, back those up the way you
back up the rest of your data there. With the ones alongside, back up the
database with `pg_dump`, e.g. nightly from cron:

```sh
docker compose exec -T postgres pg_dump -U hotseat -Fc hotseat > hotseat-$(date +%F).dump
```

…and the images:

```sh
docker compose cp hotseat:/data/images ./images-backup
```

### Restoring

```sh
docker compose stop hotseat
docker compose exec -T postgres pg_restore -U hotseat -d hotseat --clean --if-exists < hotseat-2026-11-02.dump
docker compose cp ./images-backup/. hotseat:/data/images
docker compose start hotseat
```

An admin can also take a copy any time, without the server: **Settings →
General → Take a copy** downloads the whole company, images included, in one
file. A fresh, empty Hotseat starts from it ([Moving from the hosted
Hotseat](administration.md#moving-from-the-hosted-hotseat) works the same
way). Restoring from `pg_dump` is still the way back for an installation
that's already running.

## Updating

Read the [release notes](https://github.com/hotseat-org/hotseat-app/releases) of every version in between, and
take a backup. Then set the new version in `.env` and:

```sh
# HOTSEAT_VERSION=0.7.0-alpha
docker compose pull
docker compose up -d
```

When the release notes say `compose.yml` changed, download it from the new
release first (as in [Installation](installation.md#1-get-the-compose-file-and-its-settings),
with the new version). `/healthz` says which version is running.

Built it yourself? In the source folder, `git fetch --tags && git checkout`
the new release's tag, then
`docker compose -f compose.yml -f compose.build.yml up -d --build`.

On start, Hotseat applies the database migrations the new version brings,
before it serves anyone. Each migration applies whole or not at all. Take a
backup first. You can't go back to an older version once a newer one has
migrated the database (restore the backup instead).

## Health

`/healthz` answers `{"status":"ok"}` (200) while Hotseat is serving and its
database answers, else `{"status":"database unreachable"}` (503). Point your
load balancer or monitoring at it. Docker uses it too: `docker compose ps`
shows the container as *healthy*.

## Admin access

When nobody who can manage the company can sign in any more (the only admin
left, or lost their account), make someone an admin from the server:

```sh
docker compose exec hotseat node server/admin.mjs list-admins
docker compose exec hotseat node server/admin.mjs make-admin someone@acme.com
```

They sign in as usual. If they've never signed in, their account is waiting
for them.

## Logs

```sh
docker compose logs -f hotseat
```

What you'll see:

- `27 migrations applied.` / `The database is up to date.`: on start.
- `Hotseat on http://localhost:3000/`: it's serving.
- `{"status":"ok","version":"0.7.0-alpha"}` at `/healthz`: the version running.
- `booking jobs { usualBooked: …, waitlisted: … }`: every hour, a minute
  after starting first: usual desks booked as days open up, and freed desks
  handed to people waiting.
- Errors with a stack trace: something failed in a request.

## Troubleshooting

| What happens | What to check |
| --- | --- |
| It won't start: "Migration … failed" | The log says why (often the database: disk space, permissions). Fix that and start again. Nothing of the failed migration was applied. |
| It won't start: "… failed earlier and needs fixing by hand" | A migration was left half-done by Prisma's own tools. Resolve it with `prisma migrate resolve` (see Prisma's docs), then start again. |
| Nobody can manage the company any more | Make someone an admin from the server: see [Admin access](#admin-access). |
| Signing in loops back to the sign-in screen | HTTPS: see [Sign-in](sign-in.md#when-sign-in-doesnt-work). |
| Saving anything fails ("does not match origin") | The reverse proxy doesn't pass the `Host` header: see [Installation](installation.md#4-https-with-a-reverse-proxy). |
| Image uploads fail | `BASE_URL` must be exactly the address people use (uploads go there). Behind nginx, `client_max_body_size` at least `12m`. Images: PNG, JPEG, GIF or WebP up to 10 MB (no SVG). |
| Bookings land on the wrong day | The office's time zone: office settings → General → Time zone (see [Administration](administration.md#offices)). |
| Invite link previews show a plain picture | Expected: the picture with the company's logo is only drawn on the hosted service. |

## Running without Docker

Hotseat is a Node app (Node 25 or newer, Bun to install dependencies) with
Postgres 15 or newer. In a copy of the [source](https://github.com/hotseat-org/hotseat-app) at the release you
want (`git clone --branch v0.7.0-alpha https://github.com/hotseat-org/hotseat-app.git`):

```sh
bun install
HOTSEAT_TARGET=node BASE_PATH=/ npx react-router build

# Before each start of a new version:
DATABASE_URL=postgres://… node server/migrate.mjs app/repositories/main-repository/prisma/migrations

HOTSEAT_EDITION=self-hosted \
DATABASE_URL=postgres://… \
IMAGES_DIR=/var/lib/hotseat/images \
BASE_URL=https://hotseat.acme.com \
COOKIES_SECRET=… \
NODE_ENV=production \
node server/node.mjs
```

…with the sign-in settings from [Configuration](configuration.md). Run it
under systemd (or similar) and behind a reverse proxy, as with Docker.
`node server/admin.mjs` (see [Admin access](#admin-access)) works the same,
with `DATABASE_URL` set.
