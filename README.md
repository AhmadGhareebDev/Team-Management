# Team Management

A collaborative task management app: workspaces, projects, a drag-and-drop task
board, and a realtime canvas where task dependencies are drawn as a graph that
updates live for everyone viewing it.

Built as a portfolio project to work through the parts of a multi-tenant app
that are usually skipped in tutorials — membership and role enforcement,
realtime fan-out with per-user capabilities, idempotent scheduled jobs, and
pagination that happens in the database rather than in memory.

## Demo

Add your deployed URL here.

The seed script creates four accounts. The password is the same for all of
them, and the emails are deliberately fake domains so nothing can be sent to
them.

| Email | Name | Role |
| --- | --- | --- |
| `owner@example.com` | Dana Ellis | Owner of both workspaces |
| `admin@example.com` | Marco Silva | Admin |
| `member@example.com` | Priya Nair | Member |
| `tom@example.com` | Tom Becker | Member |

Password: `Demo1234!`

Sign in as different people in two browser windows to watch the canvas and the
notification bell update in realtime.

## Features

**Workspaces and membership**
- Create workspaces, invite people by username search, promote or demote them
  between owner, admin and member
- Pending invitations are reusable: re-inviting someone updates the existing
  row rather than stacking duplicates
- Owners and admins can edit workspace details; only owners can delete it

**Projects and tasks**
- Projects belong to a workspace and have their own member list
- Tasks have a status, a priority, a due date and multiple assignees
- Dependencies between tasks inside a project, with cycle detection so the
  graph can never deadlock
- A task whose dependency is overdue is flagged as blocked, and is unblocked
  automatically once the dependency is finished

**Canvas**
- React Flow board per project, with positions stored per task
- Node positions save on drag end and stay local to the person dragging, so
  moving a node never fights with someone else's view
- Live updates over Ably: task edits, dependency changes and presence

**Notifications**
- Bell dropdown with an unread count, grouped into tabs
- Assigned, unblocked, overdue, due-soon, dependency-overdue and
  dependency-resolved events, plus workspace invitations
- Overdue and due-soon alerts are produced by a scheduled sweep rather than by
  someone having the app open

**Lists**
- Server side pagination, filtering and sorting on every list view
- URL-driven, so filters and pages are shareable and back/forward work

**Accounts**
- Email and password with verification, plus OTP-based reset
- Avatar upload direct to ImageKit, authorised per user by a signed request
- Delete account, which also removes the user's uploaded files

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components, Partial Prefetching) |
| Database | Postgres on Neon, via `@neondatabase/serverless` |
| ORM | Drizzle |
| Auth | Better Auth (email + password, email OTP) |
| Realtime | Ably |
| Media | ImageKit |
| UI | Tailwind v4, shadcn/ui, Base UI, React Flow |
| Forms | react-hook-form + Zod |
| Tests | Vitest |

## Architecture notes

A few decisions that are worth knowing about before reading the code.

**Blocked status is derived, not stored by the client.** When a dependency is
completed or removed, the affected tasks have to be re-evaluated. That is done
in a single `UPDATE ... FROM (SELECT ...)` statement — see `syncTaskBlocked` in
`src/actions/task.ts`. The Neon HTTP driver has no transaction support, so a
statement that has to be atomic has to be one statement.

**Realtime notifications are deduplicated at two levels.** `hasNotified()`
avoids the round trip in the common case, and the
`notification_user_task_type_uidx` unique index makes "one notification per
user, task and type" a database guarantee, so two callbacks racing on the same
event cannot produce two rows.

**The scheduled sweep is scoped by workspace, not by user.** One pass covers
every member of a workspace and derives recipients from the task's assignees
and the workspace's owners and admins. Sweeping per user would rescan the same
rows once per member.

**Page guards are separate from action guards.** Every server action checks
membership and role on its own, but that only protects writes. `requireWorkspaceMembership`
and `requireWorkspaceManager` in `src/lib/guards.ts` cover the reads as well.
They call `notFound()` rather than returning 403, so a workspace you cannot see
is indistinguishable from one that does not exist.

**Pagination is in the database.** Every list view takes a page and a page size
and does a `LIMIT`/`OFFSET` with a matching `COUNT`, rather than fetching
everything and slicing it.

## Getting started

Requires Node 20.9 or newer and a Postgres database. Neon's free tier is
enough.

```bash
npm install
cp .env.example .env      # then fill it in
npx drizzle-kit migrate   # create the schema
npm run demo:seed         # optional: a workspace with realistic data
npm run dev
```

Open http://localhost:3000 and sign in with one of the [demo accounts](#demo).

`npm run demo:seed` is idempotent: it wipes and recreates only the rows it
owns (ids prefixed `ws_demo_`, `usr_demo_`, `tsk_demo_`), and never touches
your own data.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Vitest, five suites |
| `npm run lint` | ESLint |
| `npm run demo:seed` | Reset and reseed the demo workspaces |
| `npm run db:reset` | Drop every table, including the migration journal |
| `npx drizzle-kit generate` | Generate a migration from the schemas |
| `npx drizzle-kit migrate` | Apply migrations |

## Deployment

Vercel, with the database on Neon. Both have free tiers that are enough for
this.

1. Push the repository and import it into Vercel.
2. Set every variable from `.env.example` in the project's environment
   variables. `BETTER_AUTH_URL` must be the deployed origin, with no trailing
   slash — password reset and verification links are built from it.
3. Run `npx drizzle-kit migrate` once against the production database.
4. Deploy.

Two things specific to the free tier:

- **Cron frequency.** `vercel.json` schedules `/api/cron/notifications` daily.
  Hobby accounts reject any expression that runs more than once a day, and the
  deploy fails rather than skipping the schedule. Raise it to `0 * * * *` on
  Pro.
- **Cron auth.** Vercel sends `Authorization: Bearer <CRON_SECRET>` on its own
  once that variable exists in the project. Without it the route refuses every
  request.

Emails are sent over Gmail SMTP, which works but is rate limited and adds SMTP
latency to the request. A transactional provider would be the swap for anything
beyond a demo.

## Testing

Vitest, `environment: "node"` — every suite covers pure logic, so there is no
DOM environment and no mocking of the network.

```bash
npm test
```

- `src/db/validations/task.test.ts` — status and dependency validation
- `src/lib/dependency-graph.test.ts` — cycle detection
- `src/components/canvas/canvas-graph.test.ts` — merging live updates into the board
- `src/lib/pagination.test.ts` — page arithmetic
- `src/lib/notification-tabs.test.ts` — tab grouping and counts
