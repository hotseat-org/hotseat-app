# Sign-in

Hotseat doesn't keep passwords. People sign in with an account they already
have: your company's identity provider (OpenID Connect), or Google or
GitHub. Set up one or more; the sign-in screen shows each that's set up.

Whoever signs in, Hotseat goes by their **email address**. The domain decides
whether they join the company on their own (see
[Administration](administration.md#who-can-join)).

In every case below, replace `https://hotseat.acme.com` with your `BASE_URL`.

## OpenID Connect (your company's sign-in)

Works with any OIDC provider. Register Hotseat as a **web application**
with:

| Setting | Value |
| --- | --- |
| Redirect / callback URI | `https://hotseat.acme.com/auth/oidc/callback` |
| Grant type | Authorization code (with PKCE) |
| Scopes | `openid email profile` |

Then set `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and
`OIDC_NAME` for the button. Hotseat reads the provider's endpoints from
`{OIDC_ISSUER}/.well-known/openid-configuration` the first time someone
signs in.

It needs the person's **email** from the provider (the `email` claim, or an
email-shaped username). An email the provider marks unverified isn't
accepted.

### Microsoft Entra ID (Microsoft 365)

1. Entra admin center → **App registrations** → **New registration**.
   Name: Hotseat. Supported accounts: this organization only. Redirect URI:
   **Web**, `https://hotseat.acme.com/auth/oidc/callback`.
2. **Certificates & secrets** → **New client secret**. Copy its *value*.
3. **API permissions**: `openid`, `email`, `profile` (Microsoft Graph,
   delegated). Grant admin consent.
4. Settings, with the **Directory (tenant) ID** and **Application (client) ID**
   from the app's overview:

   ```sh
   OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
   OIDC_CLIENT_ID=<application-id>
   OIDC_CLIENT_SECRET=<secret value>
   OIDC_NAME=Microsoft
   ```

Accounts without a mailbox may have no `email` claim. Hotseat then uses
their sign-in name if it's an email address (it usually is).

### Google Workspace

Either use the **Google** sign-in below (any Google account can then sign
in; let only your domain join, see [who can join](administration.md#who-can-join)),
or OIDC with an internal app:

1. Google Cloud console → **APIs & Services** → **OAuth consent screen**:
   user type **Internal** (your Workspace only).
2. **Credentials** → **Create credentials** → **OAuth client ID** → Web
   application. Authorized redirect URI:
   `https://hotseat.acme.com/auth/oidc/callback`.
3. Settings:

   ```sh
   OIDC_ISSUER=https://accounts.google.com
   OIDC_CLIENT_ID=<client id>
   OIDC_CLIENT_SECRET=<client secret>
   OIDC_NAME=Google Workspace
   ```

### Okta

1. **Applications** → **Create App Integration** → OIDC, **Web Application**.
2. Sign-in redirect URI: `https://hotseat.acme.com/auth/oidc/callback`.
   Assign the people or groups who should get in.
3. Settings:

   ```sh
   OIDC_ISSUER=https://<your-org>.okta.com
   OIDC_CLIENT_ID=…
   OIDC_CLIENT_SECRET=…
   OIDC_NAME=Okta
   ```

### Keycloak

1. In your realm: **Clients** → **Create client** → OpenID Connect, client
   ID `hotseat`, **Client authentication** on.
2. Valid redirect URIs: `https://hotseat.acme.com/auth/oidc/callback`.
3. **Credentials** tab: copy the client secret.
4. Settings:

   ```sh
   OIDC_ISSUER=https://keycloak.acme.com/realms/<realm>
   OIDC_CLIENT_ID=hotseat
   OIDC_CLIENT_SECRET=…
   OIDC_NAME=Acme SSO
   ```

### Authentik

1. **Applications** → **Providers** → **Create** → OAuth2/OpenID Provider,
   client type **Confidential**, redirect URI
   `https://hotseat.acme.com/auth/oidc/callback`, scopes `openid email profile`.
2. Create an **Application** using that provider, slug `hotseat`.
3. Settings:

   ```sh
   OIDC_ISSUER=https://authentik.acme.com/application/o/hotseat/
   OIDC_CLIENT_ID=…
   OIDC_CLIENT_SECRET=…
   OIDC_NAME=Authentik
   ```

## Google accounts

1. Google Cloud console → **Credentials** → **OAuth client ID** → Web
   application.
2. Authorized redirect URI: `https://hotseat.acme.com/auth/google/callback`.
3. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## GitHub accounts

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New**.
2. Authorization callback URL: `https://hotseat.acme.com/auth/github/callback`.
3. `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

GitHub only gives Hotseat an email the person has made public on their
profile. Without one, they can't sign in with GitHub.

## When sign-in doesn't work

| What happens | Likely why |
| --- | --- |
| The provider says the redirect URI doesn't match | The registered URI isn't exactly `{BASE_URL}/auth/<provider>/callback`: check `http` vs `https`, the path, a trailing slash. |
| Back at the sign-in screen after signing in | No HTTPS, so the browser drops the session cookie. Or `COOKIES_SECRET` changed between the two requests (several containers with different secrets). |
| The button isn't there | Its settings are missing or misspelt; both the ID and the issuer/secret are needed. Restart after changing `.env`. |
| An error after the provider | Look in `docker compose logs hotseat`: "OIDC discovery failed" means `OIDC_ISSUER` is wrong or unreachable from the server; "gave no email" means the provider sends no email for that account. |
