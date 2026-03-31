# kalash-book

> A minimal, opinionated mobile book reader built with Expo + React Native.
> No cloud. No sign-up. Just your books.

---

## Why this exists

Every reader app either does too much or lacks the one thing you actually need.
This one was built for a specific reader — and shaped by real feedback from the most demanding QA engineer I know.

---

## Features

### Library

- Import **EPUB** and **PDF** files from the file system or via the system Share sheet
- Grid view with cover thumbnails (auto-extracted when available)
- Sort by date added or title
- Full-text search across book titles
- Empty and loading states handled

### Shelves (Categories)

- Create, rename, and delete custom shelves
- Assign one book to multiple shelves
- Browse books filtered by shelf

### Reader

| Format | Rendering                                       |
| ------ | ----------------------------------------------- |
| EPUB   | Adaptive HTML reader via `@epubjs-react-native` |
| PDF    | Page-by-page via `react-native-pdf`             |

- Reading position auto-saved on exit and app close
- Table of Contents with chapter navigation (EPUB, PDF)
- Reader controls accessible without leaving the page

### Reading Settings

- Light / Dark theme
- Font size adjustment
- Settings panel overlaid during reading — no context switching

### Book Status

| Status      | Trigger                 |
| ----------- | ----------------------- |
| New         | Default after import    |
| In Progress | Automatic on first open |
| Finished    | Set manually            |

### Rating & Notes

- 1–10 star rating — editable at any time
- Free-text notes per book — add, edit, delete

---

## Tech Stack

| Layer             | Choice                                                               |
| ----------------- | -------------------------------------------------------------------- |
| Framework         | Expo 55 (canary) + React Native 0.83                                 |
| Navigation        | Expo Router (file-based)                                             |
| Storage           | SQLite via `expo-sqlite` + Drizzle ORM                               |
| State             | React hooks + MMKV / SQLite                                          |
| Local persistence | `react-native-mmkv` (reading position, settings)                     |
| Styling           | NativeWind v4 (Tailwind for RN)                                      |
| EPUB rendering    | `@epubjs-react-native/core`                                          |
| PDF rendering     | `react-native-pdf`                                                   |
| File access       | `expo-document-picker`, `expo-file-system`, `react-native-blob-util` |
| Gestures          | `react-native-gesture-handler` + `react-native-reanimated`           |
| Share intent      | `react-native-receive-sharing-intent`                                |

---

## Project Structure

```
src/
  features/
    book-library/     # Library UI: grid, filters, import FAB, action sheets
    reader/           # EPUB/PDF readers, TOC, settings panel
  components/         # Shared UI: StarRating, ReaderErrorBoundary
  hooks/              # Shared hooks
  services/           # File parsing, DB queries
  hooks/              # Custom state hooks (useLibrary, useReaderSettings, …)
  types/              # Shared TypeScript types
app/
  (tabs)/             # Tab navigator (library, categories)
  book/               # Book detail screen
  reader/             # Full-screen reader screen
```

---

## Getting Started

```bash
npm install
npx expo run:ios      # or run:android
```

Requires a local dev build — Expo Go is not supported due to native modules.

---

## Data Storage

All data is local. Nothing leaves the device.

| Data                                                | Storage                                |
| --------------------------------------------------- | -------------------------------------- |
| Book files                                          | `expo-file-system` (app documents dir) |
| Library metadata, categories, status, rating, notes | SQLite via Drizzle                     |
| Reading position, UI settings                       | MMKV                                   |

Deleting a book removes the file, all metadata, status, rating, notes, and reading position.

---

## Known MVP Constraints

- No search inside books
- No cloud sync or backup
- No user accounts
- PDF table of contents are best-effort only
- Single font in reader

---

## MVP Acceptance Criteria

- [x] EPUB / PDF files load and render correctly
- [x] Reading position persists across sessions
- [x] Library search works
- [x] Shelves / categories work
- [x] Book statuses tracked
- [x] Table of Contents navigable (EPUB required)
- [x] Font size and theme switchable during reading
- [x] Rating and notes per book
