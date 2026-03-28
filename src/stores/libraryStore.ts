import { create } from 'zustand';

import { getAllBooks } from '@/services/db/books';
import type { Book, ReadingStatus } from '@/types';
import type { BookRow } from '@/services/db/schema';

// ---------------------------------------------------------------------------
// Mapper: DB row → domain type
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
  loading: boolean;
  error: string | null;
  /** Reload books from SQLite. */
  refresh: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  books: [],
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const rows = getAllBooks();
      set({ books: rows.map(rowToBook), loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, loading: false });
    }
  },
}));
