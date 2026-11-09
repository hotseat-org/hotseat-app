# Self-hosting Hotseat

Hotseat can run on your own server as **one company's own installation**:
your offices, your people and your bookings, in your own database, on your
own domain.

This guide is for whoever installs and looks after it.

| Guide | What's in it |
| --- | --- |
| [Installation](installation.md) | Docker Compose, HTTPS with a reverse proxy, first start |
| [Configuration](configuration.md) | Every setting, in one table |
| [Sign-in](sign-in.md) | Microsoft Entra, Google Workspace, Okta, Keycloak, Authentik, Google, GitHub |
| [Administration](administration.md) | First run, moving from the hosted Hotseat, who can join, invites, members, offices |
| [Operations](operations.md) | Backups, updates, logs, troubleshooting, running without Docker |

## What you get

The same Hotseat as the hosted service: the 3D office, booking by the day,
Find a seat, Who's in, teams, permanent desks, opening days and holidays,
the office editor, insights, phones, English and Czech.

A self-hosted installation is **one company**. Whoever sets it up names it
and decides who can join, usually everyone with a company email address.
There's no "New organization" and no product page or demo.

Already using the hosted Hotseat? Your organization comes along whole:
offices, people, teams and every booking. See
[Moving from the hosted Hotseat](administration.md#moving-from-the-hosted-hotseat).

## License

Hotseat is under the **Functional Source License**
([FSL-1.1-ALv2](https://github.com/hotseat-org/hotseat-app/blob/main/LICENSE.md)):

- **Free to run for your own company**: install it, use it, change it for
  your own needs.
- **Not for competing with Hotseat**: you may not offer it, or something
  built on it, as a product or service of the same kind (e.g. hosting desk
  booking for other companies).
- **Each version becomes Apache 2.0**, a permissive open-source license, two
  years after it's released.

## What you need

- A machine with **Docker** and Docker Compose. One CPU and 1 GB of memory
  are plenty for an office of a few hundred people.
- A **domain name** (e.g. `hotseat.acme.com`) and **HTTPS** in front of
  Hotseat. Sign-in doesn't work over plain HTTP, except on `localhost`.
- A way for people to **sign in**: an OpenID Connect provider (Microsoft
  Entra, Google Workspace, Okta, Keycloak…), or Google or GitHub accounts.

## How it fits together

```
 people's browsers ──HTTPS──▶ reverse proxy ──HTTP──▶ hotseat (Node) ──▶ postgres
                                                        │
                                                        └─ /data/images (logos, photos)
```

- **hotseat**: one container (about 200 MB). It brings the database up to
  date on start, serves the app, keeps uploaded images on a volume, and runs
  the hourly booking job (usual desks, waitlists).
- **postgres**: Postgres 17 in its own container, with its data on a volume.
  Or your own Postgres, e.g. a managed one (see [Configuration](configuration.md#database)).
- **Images**: on a volume, or in your own Cloudflare Images account (see
  [Configuration](configuration.md#images)).
- **Reverse proxy**: yours (Caddy, nginx, Traefik…). It handles HTTPS.

Nothing calls home: Hotseat talks only to your database, your sign-in
provider, Cloudflare if you keep images there, and (when someone signs in)
the place their profile photo is kept, which it copies once.
