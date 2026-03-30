import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

import { getAllBooks, deduplicateBooks, deleteBook } from '@/services/db/books';
import { getAllPositionsMap } from '@/services/db/positions';
import { getAllNotesCountMap } from '@/services/db/notes';
import type { Book, ReadingStatus } from '@/types';
import type { BookRow } from '@/services/db/schema';

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    coverPath: row.coverPath,
    filePath: row.filePath,
    format: row.format as Book['format'],
    status: row.status as ReadingStatus,
    rating: row.rating,
    dateAdded: row.dateAdded,
    dateModified: row.dateModified,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface LibraryState {
  books: Book[];
  /** bookId → 0–1 read percentage from SQLite canonical store. */
  progressMap: Record<string, number>;
  /** bookId → number of notes (only entries where count > 0). */
  notesCountMap: Record<string, number>;
  loading: boolean;
  error: string | null;
  /** Reload books and progress from SQLite. */
  refresh: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  books: [],
  progressMap: {},
  notesCountMap: {},
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      // 1. Remove duplicate DB records (same filePath → keep latest dateAdded)
      deduplicateBooks();

      // 2. Remove records where the file no longer exists on disk
      const rows = getAllBooks();
      await Promise.all(
        rows.map(async (row) => {
          const info = await FileSystem.getInfoAsync(row.filePath);
          if (!info.exists) deleteBook(row.id);
        }),
      );

      // 3. Load clean list
      const cleanRows = getAllBooks();
      const progressMap = getAllPositionsMap();
      const notesCountMap = getAllNotesCountMap();
      set({ books: cleanRows.map(rowToBook), progressMap, notesCountMap, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, loading: false });
    }
  },
}));
