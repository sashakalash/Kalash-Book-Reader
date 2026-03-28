import { create } from 'zustand';

import { getAllBooks } from '@/services/db/books';
import { getAllPositionsMap } from '@/services/db/positions';
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
  loading: boolean;
  error: string | null;
  /** Reload books and progress from SQLite. */
  refresh: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  books: [],
  progressMap: {},
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const rows = getAllBooks();
      const progressMap = getAllPositionsMap();
      set({ books: rows.map(rowToBook), progressMap, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, loading: false });
    }
  },
}));
