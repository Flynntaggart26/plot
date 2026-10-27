# Plot

> **Plot your day.** An ADHD-friendly, mobile-first productivity app for today's plan, must-dos, focus timers, linked notes, and idea sparks. Fully local — no account, no cloud.

[![Expo SDK 58](https://img.shields.io/badge/Expo-58-blue?logo=expo)](https://docs.expo.dev/versions/latest/)
[![React Native 0.88](https://img.shields.io/badge/React%20Native-0.88-blue?logo=react)](https://reactnative.dev/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Expo Router](https://img.shields.io/badge/Expo%20Router-58-blue?logo=expo)](https://docs.expo.dev/router/)
[![SQLite + Drizzle](https://img.shields.io/badge/SQLite-Drizzle-green?logo=sqlite)](https://orm.drizzle.team/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Download (Windows)

The latest `.exe` is on the [Releases page](https://github.com/Flynntaggart26/plot/releases/latest).

- **Installer:** `Plot_<version>_x64-setup.exe` — installs Plot and adds a Start Menu shortcut.
- **Portable:** `Plot_<version>_x64_portable.zip` — unzip and run `Plot.exe`; no installation.

Both use Microsoft Edge WebView2 (the installer downloads it automatically if it is missing). Data stays on the device in the app's local SQLite database — no account, no cloud.

---

## Overview

Plot is a local-first productivity mobile application designed for ADHD-friendly workflows. Instead of complex dashboards and endless lists, it focuses on:

- **Today-first**: A single screen showing what matters right now — energy level, must-dos (max 3), open tasks, and a 07:00–23:00 timeline with a live "now" line.
- **Must-do rule**: At most 3 open must-dos at any time. This forces prioritization and prevents overwhelm.
- **Quick capture**: A centered FAB opens a sheet to capture a task, a note, or an idea without navigation friction. Notes and ideas get their own full screens; ideas start as sparks and can be saved, committed, or archived later.
- **Zero friction**: Works fully offline with SQLite on-device. No sign-up, no tracking, no cloud.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/) | Cross-platform React Native runtime |
| UI | [React Native 0.88](https://reactnative.dev/) + [React 19](https://react.dev/) | Native UI components |
| Navigation | [Expo Router 58](https://docs.expo.dev/router/) | File-system based routing (`src/app`) |
| Styling / Motion | [Reanimated 4](https://docs.swmansion.com/react-native-reanimated/) | Animations and gestures |
| State | [Zustand 5](https://zustand-demo.pmnd.rs/) | Ephemeral UI state (capture sheet, etc.) |
| Server state | [TanStack Query 5](https://tanstack.com/query/latest) | Optimistic task toggles, query caching |
| Database | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [Drizzle ORM 0.45](https://orm.drizzle.team/) | Local SQLite storage with type-safe migrations |
| Desktop shell | [Tauri 2](https://v2.tauri.app/) (Rust) | Windows `.exe` around the Expo web build |
| Validation | [Zod 4](https://zod.dev/) | Runtime schema validation |
| Fonts | [Inter](https://rsms.me/inter/) + [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) | Design system typography |
| Language | TypeScript 6 | Type safety across the codebase |

## Features (Week 1 — Shipped)

### Today (`/`)
- **Energy selector**: Persisted 1–5 subjective energy level for the day.
- **Must-do card**: Up to 3 open must-dos (`priority = 1`). The `+` action hides when the limit is reached.
- **Today's tasks**: Open and completed tasks grouped by status, filtered to the local day.
- **Timeline**: Static 07:00–23:00 hour grid with a live "now" line (updates every minute).
- **Quick capture**: Centered FAB opens the capture sheet to create a task instantly.

### Tasks
- **Create / Edit / Complete / Reopen / Delete**: Full CRUD with inline delete confirmation.
- **Must-do promotion/demotion**: Reopening a must-do when already at 3 open must-dos demotes it to a normal task (reopen is never blocked).
- **Audit log**: Every status change is written to `task_events` for future statistics/undo.
- **Optimistic UI**: Toggles update immediately via TanStack Query; roll back on error.

### Database (SQLite + Drizzle)
15 tables: `areas`, `projects`, `tasks`, `task_events`, `focus_sessions`, `notes`, `note_links`, `tags`, `note_tags`, `ideas`, `daily_plans`, `chat_threads`, `chat_messages`, `ai_runs`, `settings`.
- Idempotent seed (Inbox area + project, default settings).
- Single migration: `drizzle/0000_medical_whizzer.sql`.
- Timestamps stored as ISO-8601 UTC; day filtering uses local-day bounds (`YYYY-MM-DD`).

### Desktop niceties
- **Keyboard capture**: `N` for a new note, `I` for an idea, `T` for a task, `C` for the capture sheet, and `⌘/Ctrl+K` from anywhere. Shortcuts stay out of the way while you type.
- **Confirmation toasts**: Save, update and delete actions confirm in a short pill above the tab bar instead of leaving the screen silent.
- **Motion with an off switch**: Warm metal sheen, a sliding tab lamp and animated check circles carry state changes; every decorative animation disappears when the OS "reduce motion" preference is on.

### Deferred (Week 2+)
- Focus screen: live timer + Skia ring progress.
- Notes: resolving `[[wikilink]]` targets into a graph view.
- Plan screen: day/week/month views.
- Share-to-Plot intent (needs native module + dev build).

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [npm](https://docs.npmjs.com/) (comes with Node)
- [Expo CLI](https://docs.expo.dev/workflow/expo-cli/) (`npm i -g expo-cli` optional; `npx expo` works)

### Installation

```bash
# Clone the repository
git clone https://github.com/Flynntaggart26/plot.git
cd plot

# Install dependencies
npm install
```

### Running the App

| Command | Description |
|---------|-------------|
| `npm start` | Start Metro bundler (native) |
| `npm run android` | Open on Android (Expo Go / dev build) |
| `npm run ios` | Open on iOS (Expo Go / dev build) |
| `npm run web` | Plain web build (UI only — SQLite **will not** open) |
| `npm run web:isolated` | Web with COEP/COOP headers on `:8082` (**required** for SQLite/web) |
| `npm run web:export` | Static production web build into `dist/` |
| `npm run web:preview` | Serve `dist/` with COEP/COOP headers on `:8090` |
| `npm run desktop:build` | Build the Windows desktop app (needs Rust + VS Build Tools) |

**Why `web:isolated`?**  
`expo-sqlite` on web (wa-sqlite) requires `SharedArrayBuffer`, which the browser only enables under [cross-origin isolation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#sharedarraybuffer_and_cross-origin_isolation). `scripts/dev-web-isolated.mjs` proxies Metro on port `8082` and injects `Cross-Origin-Embedder-Policy: credentialless` and `Cross-Origin-Opener-Policy: same-origin` headers so the database can open.

```bash
npm run web:isolated
# Then open: http://localhost:8082
```

### Windows desktop (`.exe`)

The desktop app is a Tauri 2 shell around the same Expo web build; Rust only hosts the WebView and the bundled assets. `src-tauri/tauri.conf.json` sends COEP/COOP on every WebView response (`app.security.headers`), so `SharedArrayBuffer` — and therefore SQLite — works like `web:preview`.

```bash
npm run web:export      # dist/
npm run desktop:build   # src-tauri/target/release/plot.exe + NSIS installer
```

CI builds and publishes both the NSIS installer and a portable zip: `.github/workflows/release-windows.yml` runs on `windows-latest` when a tag such as `app-v*` is pushed (or manually via **Run workflow**).

### Type Safety & Linting

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npx expo-doctor     # diagnose dependency/config issues
```

---

## Project Structure

```
plot/
├── .github/workflows/
│   └── release-windows.yml  # Tauri build + GitHub Release (.exe)
├── app.json                 # Expo config (icons, splash, plugins)
├── babel.config.js          # Metro Babel (inline-import for .sql migrations)
├── metro.config.js          # Metro config (COEP/COOP headers, wasm/sql assets)
├── drizzle.config.ts        # Drizzle Kit configuration
├── drizzle/
│   ├── 0000_medical_whizzer.sql   # Migration 0000
│   ├── migrations.js              # Compiled migration runner
│   ├── migrations.d.ts            # Migration types
│   └── meta/                      # Drizzle meta snapshot
├── scripts/
│   ├── dev-web-isolated.mjs       # COEP/COOP proxy for web SQLite
│   ├── serve-web.mjs              # Static dist/ server with isolation headers
│   └── make-brand-assets.ps1      # Brand asset generator
├── src-tauri/                     # Tauri 2 (Rust) desktop shell
│   ├── Cargo.toml
│   ├── tauri.conf.json            # Window, COOP/COEP headers, NSIS bundle
│   └── src/main.rs
├── src/
│   ├── app/                       # Expo Router routes (file-system navigation)
│   │   ├── _layout.tsx            # Root layout: DB gate → migrations → stack
│   │   ├── +not-found.tsx         # 404 fallback
│   │   ├── (tabs)/                # Tab navigator (Today, Focus, Notes, Tangent)
│   │   │   ├── _layout.tsx        # Tab bar + capture sheet
│   │   │   ├── index.tsx          # Today screen
│   │   │   ├── focus.tsx          # Focus screen (placeholder)
│   │   │   ├── notes.tsx          # Notes screen (placeholder)
│   │   │   └── tangent.tsx        # Tangent screen (placeholder)
│   │   ├── task/[id].tsx          # Task detail / edit
│   │   ├── task/new.tsx           # New task form
│   │   ├── note/[id].tsx          # Note detail (placeholder)
│   │   ├── tangent/[id].tsx       # Idea detail (placeholder)
│   │   ├── plan/index.tsx         # Plan (placeholder)
│   │   ├── muse/index.tsx         # AI chat (placeholder)
│   │   └── settings/              # AI, appearance, data (placeholders)
│   ├── db/                        # Data layer
│   │   ├── client.ts              # SQLite connection + drizzle instance
│   │   ├── schema.ts              # Drizzle schema (15 tables)
│   │   └── seed.ts                # Idempotent seed (Inbox)
│   ├── features/                  # Feature slices
│   │   ├── tasks/                 # Task CRUD + queries + service
│   │   │   ├── service.ts         # Business rules (must-do limit, audit events)
│   │   │   ├── queries.ts         # TanStack Query hooks
│   │   │   ├── TaskForm.tsx       # Create/edit form
│   │   │   └── TaskRow.tsx        # Task list row
│   │   └── today/                 # Today feature (energy, timeline)
│   │       ├── service.ts
│   │       ├── queries.ts
│   │       ├── EnergyRow.tsx
│   │       └── Timeline.tsx
│   ├── lib/                       # Shared utilities
│   │   ├── date.ts                # Local day keys, bounds, labels
│   │   ├── haptics.ts             # Haptic feedback abstraction
│   │   ├── id.ts                  # UUID via expo-crypto
│   │   ├── navigation.ts          # dismissToRoot() helper
│   │   └── ui-store.ts            # Zustand UI state (capture sheet)
│   └── ui/                        # Design system & components
│       ├── theme.tsx              # ThemeProvider (dark/light/system)
│       ├── tokens.ts              # Colors, type, space, radius, duration, haptics
│       ├── components/            # Reusable UI components
│       └── motion/                # Reanimated hooks & presets
```

---

## Key Architectural Decisions

### Local-first SQLite
Data lives on-device via `expo-sqlite`. The root layout gates rendering on `initDatabase()` → migrations → `seedDatabase()`, so no Drizzle call happens before the connection is ready.

### Must-do limit = 3
Enforced in `service.ts` (`countOpenMustDos()`). At most 3 open tasks can have `priority = 1`. This is the core ADHD constraint: choose what matters today, ignore the rest.

### Optimistic UI
TanStack Query mutations roll back to a snapshot on error (`useToggleTask`), so taps feel instant even though SQLite writes are synchronous.

### Web isolation
Plain `expo start --web` cannot open SQLite because it lacks COEP/COOP headers. Use `npm run web:isolated` for local web verification with a working database.

### Turkish UI
All user-facing strings are in Turkish (`Günaydın`, `Bugünün Görevleri`, `Must-do`, etc.), following the `tr-TR` locale for dates and greetings.

---

## Roadmap

| Phase | Focus |
|-------|-------|
| Week 1 | ✅ Tasks + Today (shipped) |
| Week 2 | Plan view (day/week/month) |
| Week 3 | Focus timer (Skia ring) |
| Week 4 | Notes editor |
| Week 5 | Data export/import (`.md` backup) |
| Week 6 | AI assistant (Muse) |
| Week 7 | Tangent idea capture |

---

## Contributing

1. Fork the repo and create your branch from `master`.
2. Make your changes and run `npm run typecheck` + `npm run lint`.
3. Commit with conventional messages (`feat:`, `fix:`, `chore:`).
4. Open a pull request.

### Notes for contributors

- `initDatabase()` must resolve before any Drizzle call; the root layout handles this ordering.
- Timestamps are ISO-8601 UTC. Day filtering converts to local-day bounds (`YYYY-MM-DD`).
- Use `aria-*` props for accessibility state on web (React Native Web ignores `accessibilityState`).
- Web theme preview: append `?theme=light` or `?theme=dark` to the URL.

---

## License

[MIT](LICENSE)

---

Built with ❤️ for ADHD-friendly productivity. No cloud, no account, just your day.