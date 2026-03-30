import { eq } from 'drizzle-orm';

import { getPositionStorage } from '../storage/mmkv';
import { db } from './client';
import { readingPositions, type ReadingPositionInsert, type ReadingPositionRow } from './schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Subset of position data written on every page turn. */
export interface PositionUpdate {
  cfi?: string | null;
  chapterIndex?: number | null;
  page?: number | null;
  percentage: number;
  textAnchor?: string | null;
}

/** MMKV key helpers */
const mmkvKey = (bookId: string) => `pos:${bookId}`;
const mmkvTsKey = (bookId: string) => `pos_ts:${bookId}`;

// ---------------------------------------------------------------------------
// MMKV layer (hot path — called on every page turn)
// ---------------------------------------------------------------------------

/** Write position to MMKV. Called debounced (~2 s) while reading. */
export function savePositionToMmkv(bookId: string, update: PositionUpdate): void {
  const now = Date.now();
  getPositionStorage().set(mmkvKey(bookId), JSON.stringify({ ...update, bookId, updatedAt: now }));
  getPositionStorage().set(mmkvTsKey(bookId), now);
}

/** Read position from MMKV. Returns null if not present. */
function loadPositionFromMmkv(
  bookId: string,
): (ReadingPositionInsert & { updatedAt: number }) | null {
  const raw = getPositionStorage().getString(mmkvKey(bookId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReadingPositionInsert & { updatedAt: number };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SQLite layer (canonical store)
// ---------------------------------------------------------------------------

/** Upsert position into SQLite. Called on background flush or periodic sync. */
export function flushPositionToSqlite(bookId: string, update: PositionUpdate): void {
  const now = Date.now();
  const row: ReadingPositionInsert = {
    bookId,
    cfi: update.cfi ?? null,
    chapterIndex: update.chapterIndex ?? null,
    page: update.page ?? null,
    percentage: update.percentage,
    textAnchor: update.textAnchor ?? null,
    updatedAt: now,
  };
  db.insert(readingPositions)
    .values(row)
    .onConflictDoUpdate({
      target: readingPositions.bookId,
      set: {
        cfi: row.cfi,
        chapterIndex: row.chapterIndex,
        page: row.page,
        percentage: row.percentage,
        textAnchor: row.textAnchor,
        updatedAt: row.updatedAt,
      },
    })
    .run();
}

function loadPositionFromSqlite(bookId: string): ReadingPositionRow | undefined {
  return db.select().from(readingPositions).where(eq(readingPositions.bookId, bookId)).get();
}

// ---------------------------------------------------------------------------
// Unified load — picks the most recent source
// ---------------------------------------------------------------------------

/**
 * Load the reading position for a book.
 * Compares MMKV and SQLite timestamps and returns the newer record.
 * Call this at reader mount to restore position.
 */
export function loadPosition(bookId: string): ReadingPositionRow | null {
  const mmkvPos = loadPositionFromMmkv(bookId);
  const sqlPos = loadPositionFromSqlite(bookId);

  if (!mmkvPos && !sqlPos) return null;
  if (!mmkvPos) return sqlPos ?? null;
  if (!sqlPos) {
    // MMKV has data, SQLite doesn't — flush so SQLite is canonical
    flushPositionToSqlite(bookId, mmkvPos);
    return { ...mmkvPos, bookId } as ReadingPositionRow;
  }

  // Both exist — take the newer one
  if (mmkvPos.updatedAt >= sqlPos.updatedAt) {
    return { ...mmkvPos, bookId } as ReadingPositionRow;
  }
  return sqlPos;
}

// ---------------------------------------------------------------------------
// Background flush — call from AppState listener
// ---------------------------------------------------------------------------

/**
 * Flush MMKV position to SQLite for a given book.
 * Called when app goes to background.
 */
export function flushBookPositionOnBackground(bookId: string): void {
  const mmkvPos = loadPositionFromMmkv(bookId);
  if (!mmkvPos) return;
  flushPositionToSqlite(bookId, mmkvPos);
}

/**
 * Flush all pending MMKV positions to SQLite.
 * Called periodically (every 30–60 s) or on app background.
 */
export function flushAllPositionsOnBackground(bookIds: string[]): void {
  for (const id of bookIds) {
    flushBookPositionOnBackground(id);
  }
}

/** Normalize percentage to 0–1 range (guards against stale 0–100 data). */
function normalizePct(pct: number): number {
  return pct > 1 ? pct / 100 : pct;
}

/**
 * Returns a map of bookId → percentage (0–1) for all books that have
 * a reading position. Merges SQLite (canonical) with MMKV (hot) data,
 * preferring the more recent value so the library screen stays current
 * even if a SQLite flush hasn't happened yet.
 */
export function getAllPositionsMap(): Record<string, number> {
  const rows = db.select().from(readingPositions).all();
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.bookId] = normalizePct(row.percentage);
  }
  // Overlay MMKV values — they may be newer than SQLite
  const storage = getPositionStorage();
  const allKeys = storage.getAllKeys();
  for (const key of allKeys) {
    if (!key.startsWith('pos:')) continue;
    const bookId = key.slice(4);
    const raw = storage.getString(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as { percentage?: number; updatedAt?: number };
      if (parsed.percentage == null) continue;
      const sqlRow = rows.find((r) => r.bookId === bookId);
      const mmkvTs = storage.getNumber(mmkvTsKey(bookId)) ?? 0;
      if (!sqlRow || mmkvTs >= sqlRow.updatedAt) {
        result[bookId] = normalizePct(parsed.percentage);
      }
    } catch {
      // skip malformed entries
    }
  }
  return result;
}
