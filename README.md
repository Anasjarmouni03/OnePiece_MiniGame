# One Piece — unified Next.js + Neon app

A single full-stack application for the treasure hunt: the map, rankings, team check-ins, staff controls, rotating QR codes, and API all deploy together on Vercel. Neon PostgreSQL is the only external application service. There is no separate backend, Supabase project, external auth provider, file-storage service, Redis, or realtime server.

The original French screens, artwork, eight teams, checkpoint order, ranking, and staff-controlled treasure-room arrival are preserved. Game state is shared through PostgreSQL and refreshed every three seconds while a page is visible.

## Deploy once on Vercel

1. Put **this folder's contents** in a GitHub repository and import it into Vercel. If importing the parent repository containing all three projects, choose **`One_Piece_Unified` as the Root Directory**. Framework: Next.js; build command: `npm run build`; install command: `npm ci`. Node.js 24 is specified in `package.json`.
2. Before the first deployment, add a **Neon Postgres** database through Vercel's Marketplace/Storage integration and connect it to this Vercel project. Use a database dedicated to this app. The integration supplies `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct). Enable the variables for the deployment environment you are deploying.
3. In Vercel's Environment Variables, add:

   | Variable | Value |
   | --- | --- |
   | `STAFF_PIN` | Your chosen staff code, at least six digits |
   | `TEAM_PINS` | All eight four-digit codes: `1:1234,2:2345,3:3456,4:4567,5:5678,6:6789,7:7890,8:8901` — replace the example codes |
   | `SESSION_SECRET` | A random secret of at least 32 characters; generate with `openssl rand -hex 32` |

   These variables are server-only. Do not prefix them with `NEXT_PUBLIC_`. There are no built-in production PINs.
4. Deploy. The build validates configuration, creates the database tables, applies versioned SQL migrations, seeds the eight teams, and builds Next.js automatically. **No manual SQL step is needed.** Missing settings or failed migrations stop the deployment.
5. Open `/api/health` to check the API/database connection; it returns `{"ok":true}` when ready. Open `/staff`, enter your chosen staff PIN, then use `/staff/qr` and `/checkin` to test the event before starting it.

The current site address is used in QR codes automatically. Set the optional `NEXT_PUBLIC_SITE_URL=https://your-domain.example` only if QR codes should always target a specific canonical domain. Leave it unset for preview deployments.

If the first deployment happened before attaching Neon or adding secrets, add them and redeploy. Preview deployments should use a separate Neon branch/database so testing and resets do not affect the live event. Connect preview environments through Neon's branching integration or assign a separate preview database URL.

## Local development with Neon

Use Node.js 24 (`nvm use` if installed), then:

```sh
npm ci
cp .env.example .env.local
# Fill in your Neon URLs and choose STAFF_PIN, TEAM_PINS, SESSION_SECRET.
npm run db:setup
npm run dev
```

Open `http://localhost:3000`. For team phones on the same Wi-Fi, use the computer's network address; a QR containing `localhost` cannot open the computer from a phone.

```sh
npm run typecheck
npm test
npm run build
npm start
```

`npm run build` applies migrations when a database URL is present. A local build without a database verifies compilation only; deploying on Vercel always requires a database and valid secrets. `npm run db:setup` always requires a database connection.

## Pages and responsibilities

| Route | Purpose |
| --- | --- |
| `/` | Live treasure map and rankings |
| `/checkin` | Team selection, PIN verification, scanned checkpoint validation |
| `/staff` | Staff login, start game, manual check-in, undo, reset |
| `/staff/qr` | Staff-only checkpoint QR display, rotating every minute |
| `/api/health` | Readiness check including a database query |

PINs are exchanged only at login. Subsequent requests use signed HttpOnly, SameSite cookies, marked Secure on HTTPS, with a 12-hour expiry. JavaScript does not store PINs or session tokens. Changing a PIN or `SESSION_SECRET` invalidates the corresponding sessions. Staff logout clears the device's cookie. Tokens are stateless: a copied cookie remains valid until expiry or credential rotation.

Login requests are limited to 20 attempts per client address per staff/team scope in a 15-minute window. PostgreSQL stores hashed address buckets, so throttling works across Vercel instances. Mutating endpoints reject cross-site origins. Checkpoint tokens accept the current and previous minute, and the database enforces ordered progress and rejects duplicates. All game mutations lock the same game row to keep check-ins, undo, reset, and start consistent.

## Configuration and migrations

- `src/config/teams.json`: one source for teams, colors, routes, start checkpoints and timing offsets. Both UI and database seeding read it. Keep IDs 1–8 and five checkpoint entries per route for the existing game.
- `src/config/game.ts`: map coordinates and display/game constants.
- `src/app/`: Next.js pages and route handlers.
- `src/server/`: PostgreSQL connection, sessions, rate limiting, QR signing, request validation.
- `db/migrations/`: ordered SQL migrations with recorded checksums. Add new files; never edit one already applied to a database.
- `scripts/migrate.mjs`: transactional migration runner with a database lock; reruns preserve game progress. Changes to team configuration are refused while a game is active; finish/reset before changing routes.
- `scripts/prepare-build.mjs`: Vercel configuration checks and database initialization.
- `tests/`: authentication, API, game rules, migration and build-configuration tests.

Runtime traffic uses Neon's pooled URL. Migrations prefer `DATABASE_URL_UNPOOLED`, falling back to `DATABASE_URL`. The `pg` pool is attached to Vercel's function lifecycle. Connection strings retain TLS settings; certificate checking is not disabled in app code.

Tests run against an isolated, in-memory PostgreSQL engine (PGlite, a development dependency), using the same migration SQL and route handlers. **PGlite is never used by the deployed app or as a runtime fallback.** No Neon credentials or database are needed for tests. A live Neon/Vercel deployment must still be verified with your connected project.

The package override updates the Vercel helper's transitive Zod 4 dependency to a patched compatible version; retain it until the upstream dependency is patched.

Integration references: [Neon connection variables](https://neon.com/docs/guides/vercel-managed-integration), [Vercel database pooling](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package), [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
