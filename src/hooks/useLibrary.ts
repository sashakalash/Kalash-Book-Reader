import { useCallback, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

import { getAllBooks, deduplicateBooks, deleteBook as deleteBookFromDb } from '@/services/db/books';
import { getAllPositionsMap } from '@/services/db/positions';
import { getAllNotesCountMap } from '@/services/db/notes';
import type { Book, ReadingStatus } from '@/types';
import type { BookRow } from '@/services/db/schema';

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

/** Library state backed by SQLite. Replaces the Zustand libraryStore. */
export function useLibrary() {
  const [books, setBooks] = useState<Book[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [notesCountMap, setNotesCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      deduplicateBooks();

      const rows = getAllBooks();
      await Promise.all(
        rows.map(async (row) => {
          const info = await FileSystem.getInfoAsync(row.filePath);
          if (!info.exists) deleteBookFromDb(row.id);
        }),
      );

      const cleanRows = getAllBooks();
      setBooks(cleanRows.map(rowToBook));
      setProgressMap(getAllPositionsMap());
      setNotesCountMap(getAllNotesCountMap());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { books, progressMap, notesCountMap, loading, error, refresh } as const;
}
