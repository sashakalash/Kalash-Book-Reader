import { FlatList, RefreshControl, Text, useWindowDimensions, View } from 'react-native';

import type { Book } from '@/types';
import { BookCard } from './BookCard';
import { EmptyState } from './EmptyState';
import { LibrarySkeleton } from './LibrarySkeleton';

interface BookGridProps {
  books: Book[];
  progressMap: Record<string, number>;
  notesCountMap: Record<string, number>;
  refreshing: boolean;
  onRefresh: () => void;
  onBookPress: (book: Book) => void;
  onMorePress: (book: Book) => void;
  onNotesPress: (book: Book) => void;
  onImport: () => void;
  isSearching?: boolean;
}

const PADDING = 16;
const GAP = 12;

/** 2-column responsive grid of BookCards. */
export function BookGrid({
  books,
  progressMap,
  notesCountMap,
  refreshing,
  onRefresh,
  onBookPress,
  onMorePress,
  onNotesPress,
  onImport,
  isSearching = false,
}: BookGridProps) {
  const { width } = useWindowDimensions();
  const numColumns = 2;
  const itemWidth = (width - PADDING * 2 - GAP) / numColumns;

  const epubCount = books.filter((b) => b.format === 'epub').length;
  const pdfCount = books.filter((b) => b.format === 'pdf').length;

  const footer =
    books.length > 0
      ? [
          epubCount > 0 ? `${epubCount} book${epubCount > 1 ? 's' : ''}` : null,
          pdfCount > 0 ? `${pdfCount} PDF${pdfCount > 1 ? 's' : ''}` : null,
        ]
          .filter(Boolean)
          .join(', ')
      : null;

  if (refreshing && books.length === 0) return <LibrarySkeleton />;
  if (books.length === 0 && isSearching) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-4xl mb-3">🔍</Text>
        <Text className="text-base font-semibold text-gray-800">No books found</Text>
        <Text className="mt-1 text-sm text-center text-gray-500">
          Try a different title or author
        </Text>
      </View>
    );
  }
  if (books.length === 0) return <EmptyState onImport={onImport} />;

  return (
    <FlatList
      data={books}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      contentContainerStyle={{ padding: PADDING, gap: GAP }}
      columnWrapperStyle={{ gap: GAP }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <View style={{ width: itemWidth }}>
          <BookCard
            book={item}
            progress={progressMap[item.id] ?? 0}
            notesCount={notesCountMap[item.id] ?? 0}
            onPress={() => onBookPress(item)}
            onMorePress={() => onMorePress(item)}
            onNotesPress={() => onNotesPress(item)}
          />
        </View>
      )}
      ListFooterComponent={
        footer ? (
          <Text className="mt-4 mb-2 text-center text-sm text-gray-400">{footer}</Text>
        ) : null
      }
      style={{ flex: 1 }}
      initialNumToRender={10}
      maxToRenderPerBatch={6}
      windowSize={5}
    />
  );
}
