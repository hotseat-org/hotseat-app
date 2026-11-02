# Installation

Hotseat ships as a Docker image built from this repository, with a Compose
file that runs it next to its own Postgres.

## 1. Get the code

```sh
git clone <this repository> hotseat
cd hotseat/self-hosting
```

## 2. Fill in the settings

```sh
cp .env.example .env
```

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
docker compose up -d --build
```

The first build takes a few minutes. Then:

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

and rebuild (`docker compose up -d --build`): the path is built into the
app. Point the proxy's `/hotseat/` at port 3000 without stripping the path.

## Trying it on your own machine

Everything above works on `localhost` without a proxy:
`BASE_URL=http://localhost:3000`. For sign-in, register
`http://localhost:3000/auth/<provider>/callback` with your provider.
