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

## Moving from the hosted Hotseat

Already using Hotseat online? Bring everything with you:

1. On the hosted Hotseat, an admin opens **Settings → General → Take a
   copy** and downloads the file (`hotseat-acme-2026-11-09.json.gz`). It
   holds the whole organization: offices and their layouts, people and
   their roles, teams, invitations, closed days, every booking with its
   history, usual and favourite desks, and the logo, office covers and
   people's photos.
2. On your own Hotseat's setup screen, choose **Start from a copy**, pick
   the file and say who can join.

Everyone then signs in with the same email as before and finds their
desks, teams and bookings where they left them. Whoever imports the copy
is an admin. A copy only goes into a Hotseat that isn't set up yet, so it
never overwrites anything.

The copy is also a backup: take one whenever you like.

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

Make someone an admin, put them in teams, or remove them from the company,
from their row (**Manage**). Removing someone cancels their bookings and
frees their permanent desk.

**Import people** adds many at once from a CSV: an export of Google
Workspace or Microsoft 365 users, or any spreadsheet with an email column.
They're members straight away, before they ever sign in. Columns are
recognised by their names:

| Column | What it does |
| --- | --- |
| `email` (or `primary email`, `user principal name`…) | Required. Who they are. |
| `name`, or `first name` + `last name` | How they're shown until they sign in. |
| `role` | `admin` makes them an admin. |
| `department`, `org unit`… | Lets you import part of the list. |
| `team` | Puts them in teams, several separated by `;`. Teams not there yet are made. |

## Teams

People who like to sit together, in any office: **Settings → Teams**.
Someone can be in several. For each team:

- **People**: pick them here, from Members (**Manage → Teams…**), or with
  the import's `team` column.
- **Where they sit**: a zone in each office (zones are drawn in the editor).
  A zone can be **kept for the team**: others can book its desks only from
  1–7 days before the day. The usual-desk job and the waitlist respect it too.
- **Team days**: the weekdays the team comes in together. People see them
  in the day picker, and get a nudge on those days if they haven't booked.

What people get: **Find a seat → With my team** (it starts with that for
anyone in a team who hasn't chosen anything else), Who's in **by team**,
their teammates ringed in the team's colour on the map, and teams in
search and on profiles.

## Offices

- **New office**: from the office menu. Draw it, or start from a template.
- **Edit layout**: the 3D editor (on a computer). Walls, doors, glass
  rooms, desks and furniture, zones for teams, several floors. Changes save
  as you go.
- **Permanent desks**: select a desk in the editor and give it a resident.
  When they're away, they give it up for the day and others can book it.
- **Office settings**: name, description, a cover photo, its **time
  zone**, and **opening**: the weekdays people can book, and days it's
  closed (holidays, a move). Closing a day cancels the bookings already made
  for it, and their people are told why.
- **Insights** (admins): how full each office gets, the busiest days, which
  desks are used, how each team comes in (together, on its team days, to
  its zone), and CSV export.

Every office decides what "today" is (and when the hourly job books usual
desks) by its time zone. A new office takes the time zone of the admin who
creates it (their browser's). Change it in the office's settings, e.g. for
an office created from abroad.

## Deleting

- **An office**: office settings → Danger zone. Its layout and bookings go
  with it.
- **The company**: Settings → Danger zone. Everything goes: offices,
  bookings, members. Hotseat is then back to its first run, and the next
  admin to sign in sets it up afresh.
