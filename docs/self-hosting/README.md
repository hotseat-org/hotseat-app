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
| [Administration](administration.md) | First run, who can join, invites, members, offices |
| [Operations](operations.md) | Backups, updates, logs, troubleshooting, running without Docker |

## What you get

The same Hotseat as the hosted service: the 3D office, booking by the day,
Find a seat, Who's in, permanent desks, the office editor, insights, phones,
English and Czech.

A self-hosted installation is **one company**. Whoever sets it up names it
and decides who can join, usually everyone with a company email address.
There's no "New organization" and no product page or demo.

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
  You can use your own Postgres instead (see [Configuration](configuration.md)).
- **Reverse proxy**: yours (Caddy, nginx, Traefik…). It handles HTTPS.

Nothing calls home: Hotseat talks only to your database, your sign-in
provider, and (when someone signs in) the place their profile photo is kept,
which it copies once.
