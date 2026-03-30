import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLibraryStore } from '@/stores/libraryStore';
import { pickAndImportBook } from '@/services/file/importer';
import { deleteBook, updateBook } from '@/services/db/books';
import { getAllCategories, getBookIdsForCategory } from '@/services/db/categories';
import { BookGrid } from '@/features/book-library/BookGrid';
import { ImportFAB } from '@/features/book-library/ImportFAB';
import { BookActionSheet } from '@/features/book-library/BookActionSheet';
import { SortFilterSheet } from '@/features/book-library/SortFilterSheet';
import { NotesModal } from '@/features/book-library/NotesModal';
import { CategoriesModal } from '@/features/book-library/CategoriesModal';
import type { SortKey } from '@/features/book-library/LibraryFilter';
import type { Book, ReadingStatus } from '@/types';
import type { CategoryRow } from '@/services/db/schema';

/** Main library screen — search, sort, category filter, notes, shelves. */
export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { books, progressMap, notesCountMap, loading, error, refresh } = useLibraryStore();

  const [importing, setImporting] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [sort, setSort] = useState<SortKey>('dateAdded');
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  // Notes modal
  const [notesBook, setNotesBook] = useState<Book | null>(null);

  // Categories modal: bookId=string → assign mode, bookId=null → manage mode, bookId=undefined → closed
  const [categoriesModalBookId, setCategoriesModalBookId] = useState<string | null | undefined>(
    undefined,
  );
  const [categoriesModalTitle, setCategoriesModalTitle] = useState<string>('');

  // Refresh whenever the tab comes into focus (e.g. returning from reader)
  useFocusEffect(
    useCallback(() => {
      refresh();
      setCategories(getAllCategories());
    }, [refresh]),
  );

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

  const handleRatingChange = useCallback(
    (book: Book, rating: number | null) => {
      updateBook(book.id, { rating, dateModified: Date.now() });
      // Update selectedBook immediately so ActionSheet reflects new rating without re-opening
      setSelectedBook((prev) => (prev?.id === book.id ? { ...prev, rating } : prev));
      refresh();
    },
    [refresh],
  );

  const handleNotesPress = useCallback((book: Book) => {
    setNotesBook(book);
  }, []);

  const handleCategoriesPress = useCallback((book: Book) => {
    setCategoriesModalBookId(book.id);
    setCategoriesModalTitle(book.title);
  }, []);

  const handleManageShelves = useCallback(() => {
    setSortSheetVisible(false);
    setCategoriesModalBookId(null);
    setCategoriesModalTitle('');
  }, []);

  const filteredBooks = useMemo(() => {
    let result = [...books];

    if (statusFilter) result = result.filter((b) => b.status === statusFilter);

    if (categoryFilter) {
      const ids = new Set(getBookIdsForCategory(categoryFilter));
      result = result.filter((b) => ids.has(b.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) => b.title.toLowerCase().includes(q) || (b.author?.toLowerCase().includes(q) ?? false),
      );
    }

    switch (sort) {
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'progress':
        result.sort((a, b) => (progressMap[b.id] ?? 0) - (progressMap[a.id] ?? 0));
        break;
      default:
        result.sort((a, b) => b.dateAdded - a.dateAdded);
    }

    return result;
  }, [books, statusFilter, categoryFilter, searchQuery, sort, progressMap]);

  const activeCategoryName = categoryFilter
    ? (categories.find((c) => c.id === categoryFilter)?.name ?? null)
    : null;

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-red-500">{error}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
          <Text className="text-3xl font-bold text-gray-900">Library</Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => {
                setSearchVisible((v) => !v);
                if (searchVisible) setSearchQuery('');
              }}
              accessibilityRole="button"
              accessibilityLabel="Search"
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            >
              <Text className="text-base">🔍</Text>
            </Pressable>
            <Pressable
              onPress={() => setSortSheetVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Sort and filter"
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            >
              <Text className="text-base">☰</Text>
            </Pressable>
          </View>
        </View>

        {/* Search bar */}
        {searchVisible && (
          <View className="mx-5 mb-3 flex-row items-center rounded-xl bg-gray-100 px-3 py-2">
            <Text className="mr-2 text-gray-400">🔍</Text>
            <TextInput
              autoFocus
              placeholder="Search by title or author…"
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-sm text-gray-900"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        )}

        {/* Active filter chips */}
        {(statusFilter || activeCategoryName) && (
          <View className="flex-row flex-wrap gap-2 mx-5 mb-2">
            {statusFilter && (
              <Pressable
                onPress={() => setStatusFilter(null)}
                className="flex-row items-center self-start rounded-full bg-blue-50 px-3 py-1 active:opacity-70"
              >
                <Text className="text-xs font-medium text-blue-600">
                  {statusFilter === 'reading'
                    ? 'Reading'
                    : statusFilter === 'want-to-read'
                      ? 'Want to read'
                      : 'Finished'}{' '}
                  ✕
                </Text>
              </Pressable>
            )}
            {activeCategoryName && (
              <Pressable
                onPress={() => setCategoryFilter(null)}
                className="flex-row items-center self-start rounded-full bg-purple-50 px-3 py-1 active:opacity-70"
              >
                <Text className="text-xs font-medium text-purple-600">{activeCategoryName} ✕</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Book grid */}
        <BookGrid
          books={filteredBooks}
          progressMap={progressMap}
          notesCountMap={notesCountMap}
          refreshing={loading}
          onRefresh={refresh}
          onBookPress={(book) => router.push(`/reader/${book.id}`)}
          onMorePress={setSelectedBook}
          onNotesPress={handleNotesPress}
          onImport={handleImport}
          isSearching={searchQuery.trim().length > 0}
        />

        <ImportFAB onPress={handleImport} loading={importing} />

        <BookActionSheet
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onRatingChange={handleRatingChange}
          onNotesPress={handleNotesPress}
          onCategoriesPress={handleCategoriesPress}
        />

        <SortFilterSheet
          visible={sortSheetVisible}
          sort={sort}
          status={statusFilter}
          categoryFilter={categoryFilter}
          categories={categories}
          onSortChange={setSort}
          onStatusChange={setStatusFilter}
          onCategoryChange={setCategoryFilter}
          onManageShelves={handleManageShelves}
          onClose={() => setSortSheetVisible(false)}
        />

        <NotesModal
          bookId={notesBook?.id ?? null}
          bookTitle={notesBook?.title ?? ''}
          onClose={() => setNotesBook(null)}
        />

        <CategoriesModal
          visible={categoriesModalBookId !== undefined}
          bookId={categoriesModalBookId ?? null}
          bookTitle={categoriesModalTitle}
          onClose={() => setCategoriesModalBookId(undefined)}
          onCategoriesChanged={() => setCategories(getAllCategories())}
        />
      </View>
    </>
  );
}
