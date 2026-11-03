# Installation

Hotseat ships as a Docker image (`ghcr.io/hotseat-org/hotseat`, for amd64
and arm64), with a Compose file that runs it next to its own Postgres.

> **Alpha.** Hotseat 0.5 is an alpha: it works, but any release may still
> change settings or behaviour. Pin the exact version (`HOTSEAT_VERSION`),
> read the release notes before updating, and keep backups.

## 1. Get the Compose file and its settings

Two files, from the release you're installing: the Compose file, and the
settings to fill in (saved as `.env`). In a folder of their own:

```sh
mkdir hotseat && cd hotseat
curl -fsSLO https://raw.githubusercontent.com/hotseat-org/hotseat-app/v0.6.0-alpha/self-hosting/compose.yml
curl -fsSL https://raw.githubusercontent.com/hotseat-org/hotseat-app/v0.6.0-alpha/self-hosting/.env.example -o .env
```

That's 0.6.0-alpha. The newest release is on the
[releases page](https://github.com/hotseat-org/hotseat-app/releases): use its version in both lines.

## 2. Fill in the settings

Open `.env` and set at least:

```sh
BASE_URL=https://hotseat.acme.com            # where people open it, no trailing slash
COOKIES_SECRET=…                             # openssl rand -hex 32
POSTGRES_PASSWORD=…                          # openssl rand -hex 16
HOTSEAT_ADMIN_EMAIL=you@acme.com             # who sets it up
```

Using your own Postgres instead of the one Compose runs? Remove
`COMPOSE_PROFILES=database` and set `DATABASE_URL` (see
[Configuration](configuration.md#database)).

…and one way to sign in (see [Sign-in](sign-in.md)), e.g. for Microsoft:

```sh
OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
OIDC_CLIENT_ID=…
OIDC_CLIENT_SECRET=…
OIDC_NAME=Microsoft
```

Every setting is in [Configuration](configuration.md).

## 3. Start it

```sh
docker compose up -d
```

Docker downloads the image (`HOTSEAT_VERSION` in `.env`). Then:

```sh
docker compose logs -f hotseat
```

should end with:

```
27 migrations applied.
Hotseat on http://localhost:3000/
```

Hotseat now listens on port `PORT` (3000) of this machine, over plain HTTP.
Put HTTPS in front of it next.

## 4. HTTPS with a reverse proxy

Sign-in needs HTTPS: sessions are kept in cookies browsers only send over
HTTPS (`localhost` is the one exception). Your proxy must also pass the
original **`Host`** header through. Hotseat checks that forms are posted
from its own host, and without it every save fails.

Hotseat sends its own security headers (no framing by other sites, no type
sniffing, a strict referrer policy), and HSTS when the proxy says the request
came over HTTPS (`X-Forwarded-Proto: https`). Don't add them again in the
proxy. Its health check is at `/healthz` (see [Operations](operations.md#health)).

### Caddy (simplest: gets its own certificates)

```caddyfile
hotseat.acme.com {
    reverse_proxy localhost:3000
}
```

### nginx

```nginx
server {
    listen 443 ssl;
    server_name hotseat.acme.com;
    # ssl_certificate … ssl_certificate_key …

    # Logos and photos up to 10 MB.
    client_max_body_size 12m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Traefik (labels on the `hotseat` service)

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.hotseat.rule=Host(`hotseat.acme.com`)
  - traefik.http.routers.hotseat.tls.certresolver=letsencrypt
  - traefik.http.services.hotseat.loadbalancer.server.port=3000
```

## 5. Set it up

Open `BASE_URL`, sign in as `HOTSEAT_ADMIN_EMAIL`, and fill in the setup
screen (the company name, and who can join). [Administration](administration.md)
covers what comes next.

## Under a path instead of a domain

To serve Hotseat at `https://intranet.acme.com/hotseat/` instead:

```sh
BASE_PATH=/hotseat/
BASE_URL=https://intranet.acme.com/hotseat
```

The path is built into the app, so the published image (served at the root)
won't do: [build it yourself](#building-it-yourself). Point the proxy's
`/hotseat/` at port 3000 without stripping the path.

## Building it yourself

To serve Hotseat under a path, run a change of your own, or try code not
released yet, build the image from the [source](https://github.com/hotseat-org/hotseat-app) instead of
downloading it. Get the release's code (or `main`, for the newest) and put
your `.env` next to its Compose files:

```sh
git clone --branch v0.6.0-alpha https://github.com/hotseat-org/hotseat-app.git hotseat-source
cp .env hotseat-source/self-hosting/
cd hotseat-source/self-hosting
docker compose -f compose.yml -f compose.build.yml up -d --build
```

`compose.build.yml` builds the image there, from the code. `/healthz` then
reports the version as `dev`.

## Trying it on your own machine

Everything above works on `localhost` without a proxy:
`BASE_URL=http://localhost:3000`. For sign-in, register
`http://localhost:3000/auth/<provider>/callback` with your provider.
