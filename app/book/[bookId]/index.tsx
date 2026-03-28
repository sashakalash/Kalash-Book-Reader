import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getBookById, updateBook } from '@/services/db/books';
import { assignCategory, removeCategory } from '@/services/db/books';
import { getAllCategories, getCategoriesForBook } from '@/services/db/categories';
import { StarRating } from '@/components/StarRating';
import type { Book, ReadingStatus } from '@/types';
import type { CategoryRow } from '@/services/db/schema';

const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: 'want-to-read', label: 'Want to read' },
  { value: 'reading', label: 'Currently reading' },
  { value: 'finished', label: 'Finished' },
];

/** Book detail screen — rating, status, categories, link to notes. */
export default function BookDetailScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [allCats, setAllCats] = useState<CategoryRow[]>([]);
  const [bookCatIds, setBookCatIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    if (!bookId) return;
    const b = getBookById(bookId);
    if (!b) return;
    setBook({
      id: b.id,
      title: b.title,
      author: b.author,
      coverPath: b.coverPath,
      filePath: b.filePath,
      format: b.format as Book['format'],
      status: b.status as ReadingStatus,
      rating: b.rating,
      dateAdded: b.dateAdded,
      dateModified: b.dateModified,
    });
    setAllCats(getAllCategories());
    setBookCatIds(new Set(getCategoriesForBook(bookId).map((c) => c.id)));
  }, [bookId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!book) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-400">Book not found</Text>
      </View>
    );
  }

  const handleRating = (rating: number) => {
    updateBook(book.id, { rating: rating || null, dateModified: Date.now() });
    refresh();
  };

  const handleStatus = (status: ReadingStatus) => {
    updateBook(book.id, { status, dateModified: Date.now() });
    refresh();
  };

  const toggleCategory = (catId: string) => {
    if (bookCatIds.has(catId)) {
      removeCategory(book.id, catId);
    } else {
      assignCategory(book.id, catId);
    }
    refresh();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="p-2 -ml-2 active:opacity-50 mr-2"
        >
          <Text className="text-2xl text-gray-700">‹</Text>
        </Pressable>
        <Text className="flex-1 text-base font-bold text-gray-900" numberOfLines={1}>
          {book.title}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 py-5 gap-6">
        {/* Cover + meta */}
        <View className="flex-row gap-4">
          <View className="w-24 aspect-[2/3] rounded-lg overflow-hidden bg-gray-100">
            {book.coverPath ? (
              <Image
                source={{ uri: `file://${book.coverPath}` }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-blue-50">
                <Text className="text-3xl font-bold text-blue-200">
                  {book.title[0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View className="flex-1 justify-center gap-1">
            <Text className="text-base font-bold text-gray-900">{book.title}</Text>
            {book.author && <Text className="text-sm text-gray-500">{book.author}</Text>}
            <Text className="text-xs text-gray-400 uppercase">{book.format}</Text>
          </View>
        </View>

        {/* Rating */}
        <View>
          <Text className="mb-2 text-sm font-semibold text-gray-700">Rating</Text>
          <StarRating value={book.rating} onChange={handleRating} size="lg" />
        </View>

        {/* Status */}
        <View>
          <Text className="mb-2 text-sm font-semibold text-gray-700">Status</Text>
          <View className="gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleStatus(opt.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: book.status === opt.value }}
                className="flex-row items-center py-2.5 active:opacity-60"
              >
                <View
                  className={`mr-3 h-4 w-4 rounded-full border-2 ${
                    book.status === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}
                />
                <Text
                  className={`text-sm ${book.status === opt.value ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Categories */}
        {allCats.length > 0 && (
          <View>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-gray-700">Categories</Text>
              <Pressable
                onPress={() => router.push('/categories')}
                accessibilityRole="button"
                className="active:opacity-50"
              >
                <Text className="text-xs text-blue-500">Manage</Text>
              </Pressable>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {allCats.map((cat) => {
                const active = bookCatIds.has(cat.id);
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => toggleCategory(cat.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={cat.name}
                    className={`rounded-full border px-3 py-1.5 ${
                      active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${active ? 'text-blue-600' : 'text-gray-600'}`}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Notes link */}
        <Pressable
          onPress={() => router.push(`/book/${bookId}/notes`)}
          accessibilityRole="button"
          className="flex-row items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 active:bg-gray-100"
        >
          <Text className="text-sm font-semibold text-gray-800">Notes</Text>
          <Text className="text-gray-400">›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
