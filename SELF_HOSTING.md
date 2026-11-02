# Self-hosting Hotseat

Hotseat can run on your own server as **one company's own installation**:
your offices, your people and your data in your own database. There's one
company per installation. Whoever sets it up names it and decides who can
join.

You need a machine with **Docker** (with Compose), a **domain name** with
HTTPS in front of it (any reverse proxy: Caddy, nginx, Traefik…), and a way
for people to **sign in** (see below).

## Quick start

```sh
cd self-hosting
cp .env.example .env    # fill it in, see below
docker compose up -d
```

This starts Hotseat and its own Postgres. On every start, Hotseat brings
the database up to date first. Then open your `BASE_URL`, sign in and set up
your company (see [First run](#first-run)).

Point your reverse proxy at the `PORT` from `.env` (3000 by default).

## Settings (`self-hosting/.env`)

| Setting | What it's for |
| --- | --- |
| `BASE_URL` | Where people open Hotseat, e.g. `https://hotseat.acme.com` (no trailing slash). Sign-in providers send people back here. |
| `PORT` | The port on this machine. |
| `COOKIES_SECRET` | A long random secret: it signs sessions and upload links. Generate one with `openssl rand -hex 32`. Keep it, since changing it signs everyone out. |
| `POSTGRES_PASSWORD` | The database's password. |
| `HOTSEAT_ADMIN_EMAIL` | Who sets Hotseat up on their first sign-in (comma-separated). Empty: whoever signs in first. |
| `OIDC_*`, `GOOGLE_*`, `GITHUB_*` | Sign-in, see below. Set up at least one. |

## Sign-in

The sign-in screen offers each way that's set up.

**OpenID Connect** (Microsoft Entra / 365, Google Workspace, Okta,
Keycloak, Authentik, and any other OIDC provider). Register Hotseat as a web
application with your provider:

- Redirect URI: `{BASE_URL}/auth/oidc/callback`
- Scopes: `openid email profile`

Then set:

```
OIDC_ISSUER=https://login.microsoftonline.com/{tenant-id}/v2.0
OIDC_CLIENT_ID=…
OIDC_CLIENT_SECRET=…
OIDC_NAME=Microsoft          # the button says "Continue with Microsoft"
```

`OIDC_ISSUER` is the address its `/.well-known/openid-configuration` sits
under.

**Google** (callback `{BASE_URL}/auth/google/callback`) and **GitHub**
(callback `{BASE_URL}/auth/github/callback`) work too: create an OAuth app
with them and set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` or
`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.

## First run

1. The admin (`HOTSEAT_ADMIN_EMAIL`, or the first person to sign in) gets a
   setup screen: the **company name**, and **who can join**, which is the
   email domains whose people get in without an invite (`acme.com, acme.cz`).
   Anyone else who signs in before that is told it isn't ready yet.
2. Then draw the first office, or start from a template.
3. People with an allowed email domain are in the moment they sign in. Invite
   anyone else (contractors, guests) from the organization's settings.

Both can be changed later in the organization's settings.

## Data and backups

- **Database**: the `database` volume (Postgres). Back it up like any
  Postgres database, e.g.
  `docker compose exec postgres pg_dump -U hotseat hotseat > hotseat.sql`.
- **Images** (logos, office photos, people's photos): the `images` volume
  (`/data/images` in the container).

## Updating

```sh
git pull
docker compose up -d --build
```

The database is migrated on start.

## Without Docker

Build for Node and run the server yourself (Node 25+, Bun to install):

```sh
bun install
HOTSEAT_TARGET=node BASE_PATH=/ npx react-router build
HOTSEAT_EDITION=self-hosted DATABASE_URL=postgres://… IMAGES_DIR=/var/lib/hotseat/images \
  BASE_URL=https://hotseat.acme.com COOKIES_SECRET=… node server/node.mjs
```

Run `bunx prisma migrate deploy --config=./app/repositories/main-repository/prisma/prisma.config.ts`
before starting a new version. `BASE_PATH` serves Hotseat under a path
instead (e.g. `/hotseat/`), and `BASE_URL` then includes it.

## Not included in a self-hosted installation

- More than one company.
- The product page and the demo.
- Preview pictures for invite links drawn with the company's logo (a plain
  picture is shown instead).
