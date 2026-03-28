import { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useLibraryStore } from '@/stores/libraryStore';
import { pickAndImportBook } from '@/services/file/importer';
import { deleteBook, updateBook } from '@/services/db/books';
import { BookGrid } from '@/features/book-library/BookGrid';
import { ImportFAB } from '@/features/book-library/ImportFAB';
import { BookActionSheet } from '@/features/book-library/BookActionSheet';
import type { Book, ReadingStatus } from '@/types';

/** Main library screen — book grid with import FAB and long-press actions. */
export default function LibraryScreen() {
  const router = useRouter();
  const { books, progressMap, loading, error, refresh } = useLibraryStore();
  const [importing, setImporting] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const result = await pickAndImportBook();
      if (result) {
        await refresh();
        if (!result.alreadyExists) {
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

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-red-500">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <BookGrid
        books={books}
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
