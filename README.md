# Plot

> Plot your day.

ADHD-friendly, mobile-first productivity app: today's plan, must-dos, focus timers, linked notes and idea sparks — fully local, no account, no cloud.

## Stack

- Expo SDK 58 · React Native 0.88 · React 19 · TypeScript
- Expo Router (`src/app`) · Reanimated 4 · Zustand · TanStack Query · Zod
- SQLite via `expo-sqlite` + Drizzle ORM (migrations in `drizzle/`)

## Run

```bash
npm start            # Metro (native)
npm run android      # Android via Expo Go / dev build
npm run web          # plain web
npm run web:isolated # web on http://localhost:8082, required for SQLite
```

`npm run web:isolated` proxies Metro and adds COEP/COOP headers so
`SharedArrayBuffer` (used by the web SQLite build) is available. Plain
`npm run web` cannot open the database.

Checks:

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

## Week 1 — Tasks and Today (shipped)

- Full schema + single migration: areas, projects, tasks, task events, day
  energy, notes/links, ideas, AI settings, settings (15 tables)
- Idempotent seed (Inbox area/project, default settings); runs after migrations
- Task CRUD: create, edit, complete/reopen, delete with inline confirm
- Must-do rule: `priority = 1`, at most 3 open; today's "+" hides at 3/3 and a
  reopened must-do over the limit demotes to a normal task
- Quick capture sheet (`+`): task active, note/idea marked "Yakında"
- Today: persisted 1–5 energy, must-do card, today's tasks, completed list,
  static 07:00–23:00 timeline with a live now-line
- Local-day filtering on ISO timestamps; optimistic toggles via TanStack Query
- Route-level safety: `dismissToRoot()` keeps cold deep links from stranding the
  user on a form after save/delete

Verified on web (isolated build): create/edit/complete/reopen/delete, 3/3 limit,
energy persistence, persistence after full reload, direct-route cold loads,
and ARIA state (`aria-checked` / `aria-selected` / `aria-disabled`).

## Deferred

- **Share-to-Plot intent** — needs a native module + dev build; untested here
  because no Android SDK/`adb` is available on this machine.
- **On-device Android verification** — same tooling gap; Android JS bundle
  builds (Metro serves `platform=android` at HTTP 200), but nothing has run on
  a device or emulator yet.

## Notes for contributors

- `initDatabase()` must resolve before any Drizzle call; the root layout gates
  render on init → migrations → seed.
- Timestamps are ISO-8601 UTC; day filtering converts local-day bounds.
- Use `aria-*` props for state on web (RN Web ignores `accessibilityState`).
- Web dark/light preview: append `?theme=light` or `?theme=dark`.
