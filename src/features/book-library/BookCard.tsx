import { Image, Pressable, Text, View } from 'react-native';

import type { Book, ReadingStatus } from '@/types';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<ReadingStatus, string> = {
  'want-to-read': 'Want',
  reading: 'Reading',
  finished: 'Done',
};

const STATUS_COLOR: Record<ReadingStatus, string> = {
  'want-to-read': 'bg-gray-200',
  reading: 'bg-blue-100',
  finished: 'bg-green-100',
};

const STATUS_TEXT_COLOR: Record<ReadingStatus, string> = {
  'want-to-read': 'text-gray-600',
  reading: 'text-blue-700',
  finished: 'text-green-700',
};

function StatusBadge({ status }: { status: ReadingStatus }) {
  return (
    <View className={`rounded-full px-2 py-0.5 ${STATUS_COLOR[status]}`}>
      <Text className={`text-[10px] font-semibold ${STATUS_TEXT_COLOR[status]}`}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ percentage }: { percentage: number }) {
  const pct = Math.min(Math.max(percentage, 0), 1);
  if (pct === 0) return null;

  return (
    <View className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-200">
      <View className="h-full rounded-full bg-blue-500" style={{ width: `${pct * 100}%` }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Cover placeholder
// ---------------------------------------------------------------------------

function CoverPlaceholder({ title }: { title: string }) {
  const letter = title.trim()[0]?.toUpperCase() ?? '?';
  return (
    <View className="h-full w-full items-center justify-center bg-blue-50">
      <Text className="text-4xl font-bold text-blue-300">{letter}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// BookCard
// ---------------------------------------------------------------------------

interface BookCardProps {
  book: Book;
  /** 0–1 read progress. Defaults to 0. */
  progress?: number;
  onPress: () => void;
  onLongPress: () => void;
}

/** Grid card showing book cover, title, author, progress bar and status badge. */
export function BookCard({ book, progress = 0, onPress, onLongPress }: BookCardProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessible
      accessibilityLabel={`${book.title}${book.author ? `, by ${book.author}` : ''}. ${STATUS_LABEL[book.status]}.`}
      accessibilityHint="Double tap to open. Long press for options."
      accessibilityRole="button"
      className="active:opacity-70"
    >
      {/* Cover */}
      <View className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-100 shadow-sm">
        {book.coverPath ? (
          <Image
            source={{ uri: `file://${book.coverPath}` }}
            className="h-full w-full"
            resizeMode="cover"
            accessibilityLabel={`Cover of ${book.title}`}
          />
        ) : (
          <CoverPlaceholder title={book.title} />
        )}
      </View>

      {/* Meta */}
      <View className="mt-1.5 px-0.5">
        <Text className="text-xs font-semibold text-gray-900 leading-tight" numberOfLines={2}>
          {book.title}
        </Text>
        {book.author && (
          <Text className="mt-0.5 text-[11px] text-gray-500" numberOfLines={1}>
            {book.author}
          </Text>
        )}

        <View className="mt-1 flex-row items-center justify-between">
          <StatusBadge status={book.status} />
          {progress > 0 && (
            <Text className="text-[10px] text-gray-400">{Math.round(progress * 100)}%</Text>
          )}
        </View>

        <ProgressBar percentage={progress} />
      </View>
    </Pressable>
  );
}
