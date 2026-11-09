# Configuration

Hotseat reads its settings from environment variables. With Docker Compose
they live in `.env`, next to `compose.yml`. Change one, then `docker compose up -d`
(or `--build` for the build-time ones).

## Required

| Setting | Example | What it's for |
| --- | --- | --- |
| `BASE_URL` | `https://hotseat.acme.com` | Where people open Hotseat, without a trailing slash; with the path if it's served under one. Sign-in providers send people back here, and upload links point here. |
| `COOKIES_SECRET` | `openssl rand -hex 32` | Signs sessions and upload links. Keep it secret and keep it the same: a new one signs everyone out. |
| `POSTGRES_PASSWORD` | `openssl rand -hex 16` | The password of the Postgres that Compose runs (not needed with [your own database](#database)). |

Plus **at least one way to sign in**, below.

## Database

By default Compose runs Postgres alongside Hotseat (`COMPOSE_PROFILES=database`
in `.env`, with its data in the `database` volume). To use **your own
Postgres** instead (a managed one like Neon, RDS or Cloud SQL, or a server
you already run), remove that line and set:

| Setting | Example | What it's for |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://hotseat:…@db.acme.com:5432/hotseat?sslmode=require` | Its connection string. Postgres 15 or newer, an empty database the user owns. Add `?sslmode=require` for one across a network. |

Compose then starts Hotseat alone. Hotseat brings that database up to date on
start, the same way. Back it up where it lives (see [Operations](operations.md#backups)).

## Images

Logos, office covers and people's photos.

| Setting | Default | What it's for |
| --- | --- | --- |
| `IMAGE_STORAGE` | `local` | `local`: on this server, in the `images` volume. `cloudflare`: your own [Cloudflare Images](https://developers.cloudflare.com/images/) account, with the four settings below. |
| `CLOUDFLARE_ACCOUNT_ID` | | Your Cloudflare account's ID. |
| `CLOUDFLARE_API_KEY` | | An API token with the **Cloudflare Images: Edit** permission. |
| `CLOUDFLARE_IMAGE_KEY` | | Images → Keys: the key that signs image URLs. |
| `CLOUDFLARE_DELIVERY_URL` | `https://imagedelivery.net/<hash>` | Images → Overview: the delivery URL, without an image id or variant. |

With Cloudflare Images, create a **variant named `thumbnail`** (Images →
Variants; e.g. 512 × 512, scale down). Hotseat asks for images at that
variant. Images are uploaded straight from the browser to Cloudflare, and
shown through signed URLs that expire daily.

Switching storage doesn't move images already kept: those uploaded before
stop showing until uploaded again.

## Version

| Setting | Example | What it's for |
| --- | --- | --- |
| `HOTSEAT_VERSION` | `0.7.0-alpha` | The release to run ([releases](https://github.com/hotseat-org/hotseat-app/releases)). Pin the exact one: while Hotseat is in alpha, any release may change things. `alpha` follows the newest alpha. |

## Setting up

| Setting | Default | What it's for |
| --- | --- | --- |
| `HOTSEAT_ADMIN_EMAIL` | (empty) | Who sets Hotseat up on their first sign-in. Several: comma-separated. Empty: whoever signs in first, so set it before you open Hotseat to anyone. |

## Sign-in

Each one shows on the sign-in screen once its settings are filled in. See
[Sign-in](sign-in.md) for setting each up.

| Setting | What it's for |
| --- | --- |
| `OIDC_ISSUER` | Your OpenID Connect provider's issuer URL: the address its `/.well-known/openid-configuration` is under. |
| `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | Hotseat's client with that provider. |
| `OIDC_NAME` | On its button: "Continue with *Microsoft*". Empty: "Continue with single sign-on". |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Sign in with Google accounts. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Sign in with GitHub accounts. |

## Server

| Setting | Default | What it's for |
| --- | --- | --- |
| `PORT` | `3000` | The port on this machine (Compose maps it to the container's 3000). |
| `BASE_PATH` | `/` | Serve under a path, e.g. `/hotseat/`. **Built in**: needs an image built yourself (see [Installation](installation.md#under-a-path-instead-of-a-domain)). `BASE_URL` then includes the path. |
| `IMAGES_DIR` | `/data/images` | Where uploaded images are kept with `IMAGE_STORAGE=local` (the `images` volume). |

## Set in the image (no need to touch)

| Setting | Value | What it's for |
| --- | --- | --- |
| `HOTSEAT_EDITION` | `self-hosted` | One company, set up by its admin; no product page or demo. |
| `NODE_ENV` | `production` | |
