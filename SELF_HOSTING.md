# Self-hosting Hotseat

Run Hotseat on your own server as one company's own installation. The full
guide is in **[docs/self-hosting](docs/self-hosting/README.md)**:

- [Installation](docs/self-hosting/installation.md): Docker Compose, HTTPS with a reverse proxy
- [Configuration](docs/self-hosting/configuration.md): every setting
- [Sign-in](docs/self-hosting/sign-in.md): Microsoft Entra, Google Workspace, Okta, Keycloak, Authentik, Google, GitHub
- [Administration](docs/self-hosting/administration.md): first run, who can join, invites, members, offices
- [Operations](docs/self-hosting/operations.md): backups, updates, logs, troubleshooting

## Quick start

```sh
cd self-hosting
cp .env.example .env    # BASE_URL, COOKIES_SECRET, POSTGRES_PASSWORD, a way to sign in
docker compose up -d    # pulls ghcr.io/hotseat-org/hotseat:$HOTSEAT_VERSION
```

Hotseat 0.5 is an alpha: pin the exact version, and read the release notes
before updating.

Put HTTPS in front of port 3000, open your `BASE_URL`, and sign in as
`HOTSEAT_ADMIN_EMAIL` to set it up.
