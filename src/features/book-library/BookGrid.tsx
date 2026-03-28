import { FlatList, RefreshControl, useWindowDimensions } from 'react-native';

import type { Book } from '@/types';
import { BookCard } from './BookCard';
import { EmptyState } from './EmptyState';
import { LibrarySkeleton } from './LibrarySkeleton';

interface BookGridProps {
  books: Book[];
  progressMap: Record<string, number>;
  refreshing: boolean;
  onRefresh: () => void;
  onBookPress: (book: Book) => void;
  onBookLongPress: (book: Book) => void;
  onImport: () => void;
}

const COLUMN_WIDTH = 120;
const PADDING = 16;
const GAP = 12;

/** Responsive grid of BookCards. Number of columns adapts to screen width. */
export function BookGrid({
  books,
  progressMap,
  refreshing,
  onRefresh,
  onBookPress,
  onBookLongPress,
  onImport,
}: BookGridProps) {
  const { width } = useWindowDimensions();
  const numColumns = Math.max(2, Math.floor((width - PADDING * 2 + GAP) / (COLUMN_WIDTH + GAP)));
  const itemWidth = (width - PADDING * 2 - GAP * (numColumns - 1)) / numColumns;

  if (refreshing && books.length === 0) {
    return <LibrarySkeleton />;
  }

  if (books.length === 0) {
    return <EmptyState onImport={onImport} />;
  }

  return (
    <FlatList
      data={books}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      key={numColumns} // force re-render on orientation change
      contentContainerStyle={{ padding: PADDING, gap: GAP }}
      columnWrapperStyle={numColumns > 1 ? { gap: GAP } : undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <BookCard
          book={item}
          progress={progressMap[item.id] ?? 0}
          onPress={() => onBookPress(item)}
          onLongPress={() => onBookLongPress(item)}
        />
      )}
      style={{ flex: 1 }}
      // Limit rendered items to keep memory usage low
      initialNumToRender={12}
      maxToRenderPerBatch={8}
      windowSize={5}
      getItemLayout={(_data, index) => ({
        length: itemWidth * 1.5 + 60,
        offset: (itemWidth * 1.5 + 60 + GAP) * Math.floor(index / numColumns),
        index,
      })}
    />
  );
}
