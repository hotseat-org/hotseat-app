# Configuration

Hotseat reads its settings from environment variables. With Docker Compose
they live in `self-hosting/.env`. Change one, then `docker compose up -d`
(or `--build` for the build-time ones).

## Required

| Setting | Example | What it's for |
| --- | --- | --- |
| `BASE_URL` | `https://hotseat.acme.com` | Where people open Hotseat, without a trailing slash; with the path if it's served under one. Sign-in providers send people back here, and upload links point here. |
| `COOKIES_SECRET` | `openssl rand -hex 32` | Signs sessions and upload links. Keep it secret and keep it the same: a new one signs everyone out. |
| `POSTGRES_PASSWORD` | `openssl rand -hex 16` | The password of the Postgres that Compose runs. |

Plus **at least one way to sign in**, below.

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
| `BASE_PATH` | `/` | Serve under a path, e.g. `/hotseat/`. **Build-time**: rebuild after changing it. `BASE_URL` then includes the path. |
| `DATABASE_URL` | set by Compose | A Postgres connection string, if you use your own Postgres instead of the one Compose runs: set it in `.env` and remove the `postgres` service (and `depends_on`) from `compose.yml`. Postgres 15 or newer. |
| `IMAGES_DIR` | `/data/images` | Where uploaded images are kept (the `images` volume). |

## Set in the image (no need to touch)

| Setting | Value | What it's for |
| --- | --- | --- |
| `HOTSEAT_EDITION` | `self-hosted` | One company, set up by its admin; no product page or demo. |
| `NODE_ENV` | `production` | |
