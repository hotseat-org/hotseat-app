# Operations

Keeping a self-hosted Hotseat running: backups, updates, logs, and what to
do when something's off. Commands run in the `self-hosting/` folder.

## Backups

Two things hold your data:

| What | Where | Holds |
| --- | --- | --- |
| The database | the `database` volume | Everything but images: the company, people, offices and layouts, bookings. |
| Images | the `images` volume (`/data/images`) | Logos, office covers, people's photos. |

Back up the database with `pg_dump`, e.g. nightly from cron:

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

## Updating

```sh
git pull
docker compose up -d --build
```

On start, Hotseat applies the database migrations the new version brings,
before it serves anyone. Each migration applies whole or not at all. Take a
backup first. You can't go back to an older version once a newer one has
migrated the database (restore the backup instead).

## Logs

```sh
docker compose logs -f hotseat
```

What you'll see:

- `27 migrations applied.` / `The database is up to date.`: on start.
- `Hotseat on http://localhost:3000/`: it's serving.
- `booking jobs { usualBooked: …, waitlisted: … }`: every hour, a minute
  after starting first: usual desks booked as days open up, and freed desks
  handed to people waiting.
- Errors with a stack trace: something failed in a request.

## Troubleshooting

| What happens | What to check |
| --- | --- |
| It won't start: "Migration … failed" | The log says why (often the database: disk space, permissions). Fix that and start again. Nothing of the failed migration was applied. |
| It won't start: "… failed earlier and needs fixing by hand" | A migration was left half-done by Prisma's own tools. Resolve it with `prisma migrate resolve` (see Prisma's docs), then start again. |
| Signing in loops back to the sign-in screen | HTTPS: see [Sign-in](sign-in.md#when-sign-in-doesnt-work). |
| Saving anything fails ("does not match origin") | The reverse proxy doesn't pass the `Host` header: see [Installation](installation.md#4-https-with-a-reverse-proxy). |
| Image uploads fail | `BASE_URL` must be exactly the address people use (uploads go there). Behind nginx, `client_max_body_size` at least `12m`. Images: PNG, JPEG, GIF or WebP up to 10 MB (no SVG). |
| Bookings land on the wrong day | Offices use Europe/Prague as "today" for now: see [Administration](administration.md#offices). |
| Invite link previews show a plain picture | Expected: the picture with the company's logo is only drawn on the hosted service. |

## Running without Docker

Hotseat is a Node app (Node 25 or newer, Bun to install dependencies) with
Postgres 15 or newer.

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
