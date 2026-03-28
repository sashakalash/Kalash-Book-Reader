import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useLibraryStore } from '@/stores/libraryStore';
import { pickAndImportBook } from '@/services/file/importer';
import { deleteBook, updateBook } from '@/services/db/books';
import { getAllCategories, getBookIdsForCategory } from '@/services/db/categories';
import { BookGrid } from '@/features/book-library/BookGrid';
import { ImportFAB } from '@/features/book-library/ImportFAB';
import { BookActionSheet } from '@/features/book-library/BookActionSheet';
import { LibraryFilter } from '@/features/book-library/LibraryFilter';
import type { LibraryFilters } from '@/features/book-library/LibraryFilter';
import type { Book, ReadingStatus } from '@/types';
import type { CategoryRow } from '@/services/db/schema';

const DEFAULT_FILTERS: LibraryFilters = { status: null, categoryId: null, sort: 'dateAdded' };

/** Main library screen — book grid with import FAB and long-press actions. */
export default function LibraryScreen() {
  const router = useRouter();
  const { books, progressMap, loading, error, refresh } = useLibraryStore();
  const [importing, setImporting] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  // Initial load
  useEffect(() => {
    refresh();
    setCategories(getAllCategories());
  }, [refresh]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const result = await pickAndImportBook();
      if (result) {
        await refresh();
        if (result.alreadyExists) {
          Alert.alert('Already in library', `"${result.title}" is already in your library.`, [
            { text: 'Open', onPress: () => router.push(`/reader/${result.bookId}`) },
            { text: 'OK', style: 'cancel' },
          ]);
        } else {
          router.push(`/reader/${result.bookId}`);
        }
      }
    } catch (err) {
      Alert.alert('Import failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setImporting(false);
    }
  }, [refresh, router]);

  const handleDelete = useCallback(
    (book: Book) => {
      Alert.alert('Delete book', `Remove "${book.title}" from your library?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteBook(book.id);
            refresh();
          },
        },
      ]);
    },
    [refresh],
  );

  const handleStatusChange = useCallback(
    (book: Book, status: ReadingStatus) => {
      updateBook(book.id, { status, dateModified: Date.now() });
      refresh();
    },
    [refresh],
  );

  const filteredBooks = useMemo(() => {
    let result = [...books];

    if (filters.status) {
      result = result.filter((b) => b.status === filters.status);
    }

    if (filters.categoryId) {
      const ids = new Set(getBookIdsForCategory(filters.categoryId));
      result = result.filter((b) => ids.has(b.id));
    }

    switch (filters.sort) {
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'progress':
        result.sort((a, b) => (progressMap[b.id] ?? 0) - (progressMap[a.id] ?? 0));
        break;
      case 'dateAdded':
      default:
        result.sort((a, b) => b.dateAdded - a.dateAdded);
        break;
    }

    return result;
  }, [books, filters, progressMap]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-red-500">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <LibraryFilter filters={filters} categories={categories} onChange={setFilters} />

      <BookGrid
        books={filteredBooks}
        progressMap={progressMap}
        refreshing={loading}
        onRefresh={refresh}
        onBookPress={(book) => router.push(`/reader/${book.id}`)}
        onBookLongPress={setSelectedBook}
        onImport={handleImport}
      />

      <ImportFAB onPress={handleImport} loading={importing} />

      <BookActionSheet
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />
    </View>
  );
}
