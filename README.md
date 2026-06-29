<h1 align="center">Big Twos</h1>
<h4 align="center">A card game to play with friends 🎲 — now real-time, modern, and deployable.</h4>

Big Twos is a card game where players take turns getting rid of all their cards via
strategic pattern matching. Rules: https://www.wikihow.com/Play-Big-Two

## Stack

- **Next.js (App Router)** — UI, auth, and user management.
- **PartyKit** — authoritative real-time game rooms over WebSockets (no more polling).
- **Postgres (Neon/Vercel)** — user store (`@neondatabase/serverless`).
- **bcrypt + jose JWT** — signup/login/admin user management.
- **framer-motion** — card rendering & animations.

The nostalgic hand-scoring engine (`checkValidHand`, `sort`, the `handTypes` table)
is preserved verbatim in `lib/game/` and reused on both client and server.
The original app is archived under `legacy/`.

## Local development

```sh
npm install
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET
# terminal 1 — realtime server
npm run party               # http://127.0.0.1:1999
# terminal 2 — web app
npm run dev                 # http://localhost:3000
```

First account created becomes the **admin** (manage users at `/admin`).
Initialize the DB once with `lib/db/schema.sql` (or it auto-creates on first signup).

### Managing accounts (CLI)

Passwords are stored as bcrypt hashes and **cannot** be read back. To inspect or reset:

```sh
npm run users:list                              # list every account (no hashes)
npm run users:reset -- <username> <newPassword> # reset a password
npm run admin:create -- <username> "<Name>" <pw># create/grant an admin (recovery)
```

All three read `DATABASE_URL` from `.env`.

## Tests

```sh
npm test                    # preserved scoring-engine sanity checks
node lib/game/smoke.mjs     # 2-player end-to-end (needs npm run party)
```

## Deploy

1. **PartyKit:** `npm run deploy:party` → note the host (e.g. `bigtwos.<you>.partykit.dev`).
2. **Vercel:** import repo, set env: `DATABASE_URL`, `JWT_SECRET`,
   `NEXT_PUBLIC_PARTYKIT_HOST=bigtwos.<you>.partykit.dev`.
3. Provision Neon Postgres, run `lib/db/schema.sql`.

Human-only, 2–4 players. Rooms are designed so AI bots can fill empty seats later.
