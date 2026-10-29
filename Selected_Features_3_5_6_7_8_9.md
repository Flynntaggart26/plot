# Plot — Selected Feature Specs (3 · 5 · 6 · 7 · 8 · 9)

Project reference: `PROJELER/productivity/plot/` (`README.md`, 0.5.0)
Default folder: `/c/Users/egecr/OneDrive/Desktop/PROJELER/`
Author directive: ULTRON | English | Surgical
Date: 2026-10-29

---

## 3 — Note Template / Quick Note

Location: `src/app/notes/` + `NoteEditor.tsx` | DB: `settings` row (`key='note_templates'`)
Implementation: 3 defaults (Günlük / Toplantı / Karar) injected via dropdown; zero new table.

## 5 — Plan Weekly Capacity Warning

Location: `src/features/plan/service.ts` + `plan/index.tsx` | DB: `tasks.duration`
Implementation: SUM(duration) over visible 7-day window; >20h → Turkish pill warning (`"Hafta dolu"`). Zero dependency.

## 6 — Voice-to-Task (QuickSpark extension)

Location: `src/lib/use-quick-capture.ts` + `QuickSpark.tsx` | DB: `tasks.audio_path` (new column) + `.mp3`
Implementation: `expo-av` 10-sec recording; saved locally; playback button in `TaskForm`. Audio deleted with task (`unlink`).

## 7 — Note Backlink Mini-Map (`react-native-svg`)

Location: `src/app/note/[id].tsx` + `features/notes/NoteLinks.tsx` | DB: `note_links` (existing)
Implementation: SVG dot map (150×150 dp); current note = filled circle; lines to backlinks; clickable dots; Turkish tooltip `"Bağlı notlar"`.

## 8 — Turkish Markdown Export (`# Görevler`)

Location: `src/features/settings/data.ts` + `lib/file-transfer.ts` | DB: reads `tasks`, `notes`, `ideas`, `focus_sessions`, `daily_plans`
Implementation: `.md` template with Turkish headings (`# Görevler`, `# Notlar`, `# Odak Blokları`, `# Fikirler`); native save dialog (desktop Tauri) / download (web).

## 9 — Focus Break Reminder (after 2 min idle)

Location: `src/features/focus/store.ts` + `service.ts` | DB: none (settings + idle timer)
Implementation: After 2 min mouse idle / touch inactivity → `ToastHost` pill `"Ara? 2 dakika hareketsiz."`; respects `prefers-reduced-motion`; disabled by default; toggle in `focus.tsx`.

---

Architecture notes: All 6 use existing SQLite + Drizzle; no cloud; Turkish locale preserved (`tr-TR`); desktop `.exe` + mobile Expo Go both supported; `index.html` interactive practice arena remains separate (`SAT math/`).
