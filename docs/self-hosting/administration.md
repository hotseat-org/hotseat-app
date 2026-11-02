# Administration

For the company's Hotseat admins: setting it up, letting people in, and
looking after offices. Everything here is in the app itself. Admins open
their company's settings from the company menu (top left) → the gear.

## First run

The first time Hotseat is opened, it has no company yet. The person named
in `HOTSEAT_ADMIN_EMAIL` (or, if that's empty, whoever signs in first) gets
a setup screen:

- **Company name**: shown at the top of every page. It also makes the
  company's address (`/app/o/acme`).
- **Who can join**: the email domains whose people get in on their own
  (see below). It's filled in with your own domain, unless that's a public
  mail service like gmail.com.

Anyone else signing in before that is told Hotseat isn't set up yet.

Then draw the first office, or start from a template and adjust it later.

## Who can join

People get into the company in two ways:

1. **By their email's domain.** Anyone signing in with an email at an
   allowed domain (e.g. `acme.com`) joins as a member straight away, with no
   invite. Change the domains in **Settings → General → Who can join**
   (several: separated by commas). Empty: invites only.
2. **By invitation.** For everyone else (contractors, guests, people with a
   personal address):
   - **Invite member** (Settings → Invitations): by email. Hotseat sends no
     emails. The invitation waits for them when they sign in with that
     address. It's valid for 7 days, and inviting again renews it.
   - **Invite link**: anyone with the link can join. Regenerate it to turn
     the old one off.

Someone who signs in but can't join sees "You're not in *Acme* yet" and a
place to paste an invite link.

Who can sign in at all is up to your sign-in provider. With Google or
GitHub sign-in, anyone with an account can sign in, and the allowed domains
are what keeps strangers out. With your own provider (OIDC), you can also
limit sign-in there, e.g. by assigning the app to a group.

## Members

**Settings → Members** lists everyone, with their role:

- **Admin**: can change the company's settings, invite and remove people,
  create and edit offices (including the 3D layout) and assign permanent
  desks, and sees insights.
- **User**: books desks, sees who's in, finds seats.

Make someone an admin, or remove them from the company, from their row.
Removing someone cancels their bookings and frees their permanent desk.

## Offices

- **New office**: from the office menu. Draw it, or start from a template.
- **Edit layout**: the 3D editor (on a computer). Walls, doors, glass
  rooms, desks and furniture, zones for teams, several floors. Changes save
  as you go.
- **Permanent desks**: select a desk in the editor and give it a resident.
  When they're away, they give it up for the day and others can book it.
- **Office settings**: name, description, a cover photo.
- **Insights** (admins): how full each office gets, the busiest days, which
  desks are used, and CSV export.

Every office decides what "today" is (and when the hourly job books usual
desks) by its time zone, Europe/Prague for now. There's no setting for it
in the app yet.

## Deleting

- **An office**: office settings → Danger zone. Its layout and bookings go
  with it.
- **The company**: Settings → Danger zone. Everything goes: offices,
  bookings, members. Hotseat is then back to its first run, and the next
  admin to sign in sets it up afresh.
