/**
 * Unit tests for the reading position dual-write logic.
 * Native modules (MMKV, expo-sqlite) are mocked — only pure logic is tested.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the module under test
// ---------------------------------------------------------------------------

/** In-memory MMKV store */
const mmkvStore: Record<string, string | number> = {};

vi.mock('react-native-mmkv', () => ({
  MMKV: class {
    set(key: string, value: string | number) {
      mmkvStore[key] = value;
    }
    getString(key: string) {
      return typeof mmkvStore[key] === 'string' ? mmkvStore[key] : undefined;
    }
    getNumber(key: string) {
      return typeof mmkvStore[key] === 'number' ? mmkvStore[key] : undefined;
    }
  },
}));

/** In-memory SQLite store for reading_positions */
const sqliteStore: Record<string, object> = {};

vi.mock('./client', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (_cond: unknown) => ({
          get: () => {
            // Extract bookId from _cond — simplified for test
            const key = Object.keys(sqliteStore)[0];
            return sqliteStore[key];
          },
        }),
      }),
    }),
    insert: (_table: unknown) => ({
      values: (row: { bookId: string } & object) => ({
        onConflictDoUpdate: () => ({
          run: () => {
            sqliteStore[row.bookId] = row;
          },
        }),
      }),
    }),
  },
}));

vi.mock('./schema', () => ({
  readingPositions: { bookId: 'bookId' },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import {
  savePositionToMmkv,
  flushPositionToSqlite,
  loadPosition,
  flushBookPositionOnBackground,
  type PositionUpdate,
} from './positions';

beforeEach(() => {
  Object.keys(mmkvStore).forEach((k) => delete mmkvStore[k]);
  Object.keys(sqliteStore).forEach((k) => delete sqliteStore[k]);
});

const update: PositionUpdate = {
  cfi: 'epubcfi(/6/4[chap01]!/4/2[body01]/16/1:0)',
  chapterIndex: 1,
  percentage: 0.25,
  textAnchor: 'The quick brown fox',
};

describe('savePositionToMmkv', () => {
  it('stores JSON in MMKV under pos:<bookId>', () => {
    savePositionToMmkv('book-1', update);
    const raw = mmkvStore['pos:book-1'];
    expect(typeof raw).toBe('string');
    const parsed = JSON.parse(raw as string);
    expect(parsed.cfi).toBe(update.cfi);
    expect(parsed.percentage).toBe(0.25);
  });

  it('stores timestamp under pos_ts:<bookId>', () => {
    const before = Date.now();
    savePositionToMmkv('book-1', update);
    const ts = mmkvStore['pos_ts:book-1'] as number;
    expect(ts).toBeGreaterThanOrEqual(before);
  });
});

describe('flushPositionToSqlite', () => {
  it('writes to sqliteStore via db.insert', () => {
    flushPositionToSqlite('book-2', update);
    expect(sqliteStore['book-2']).toBeDefined();
    const row = sqliteStore['book-2'] as { percentage: number };
    expect(row.percentage).toBe(0.25);
  });
});

describe('loadPosition', () => {
  it('returns null when no data exists', () => {
    // Override sqlite get to return undefined for clean state
    const result = loadPosition('missing-book');
    expect(result).toBeNull();
  });

  it('returns MMKV data when only MMKV has a record', () => {
    savePositionToMmkv('book-3', { ...update, percentage: 0.5 });
    // sqliteStore is empty, so sqlite returns undefined
    const result = loadPosition('book-3');
    expect(result).not.toBeNull();
    expect(result?.percentage).toBe(0.5);
    // Should also have flushed to SQLite
    expect(sqliteStore['book-3']).toBeDefined();
  });
});

describe('flushBookPositionOnBackground', () => {
  it('flushes MMKV to SQLite when called', () => {
    savePositionToMmkv('book-4', { ...update, percentage: 0.9 });
    flushBookPositionOnBackground('book-4');
    expect(sqliteStore['book-4']).toBeDefined();
    const row = sqliteStore['book-4'] as { percentage: number };
    expect(row.percentage).toBe(0.9);
  });

  it('is a no-op when MMKV has no data for bookId', () => {
    flushBookPositionOnBackground('unknown-book');
    expect(sqliteStore['unknown-book']).toBeUndefined();
  });
});
