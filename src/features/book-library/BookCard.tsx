import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Book } from '@/types';

// ---------------------------------------------------------------------------
// Cover placeholder — generated gradient-like bg from title initial
// ---------------------------------------------------------------------------

const PLACEHOLDER_COLORS = [
  ['#1a1a2e', '#16213e'],
  ['#2d1b69', '#11998e'],
  ['#373b44', '#4286f4'],
  ['#4a1942', '#c0392b'],
  ['#134e5e', '#71b280'],
  ['#373b44', '#8e44ad'],
];

function CoverPlaceholder({ title, author }: { title: string; author: string | null }) {
  const idx = title.charCodeAt(0) % PLACEHOLDER_COLORS.length;
  const [bg] = PLACEHOLDER_COLORS[idx];

  return (
    <View
      className="h-full w-full items-center justify-center px-3"
      style={{ backgroundColor: bg }}
    >
      <Text className="text-center text-xs font-semibold text-white leading-snug" numberOfLines={6}>
        {title}
      </Text>
      {author && (
        <Text className="mt-2 text-center text-[10px] text-white/70" numberOfLines={2}>
          {author}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// BookCard
// ---------------------------------------------------------------------------

interface BookCardProps {
  book: Book;
  progress?: number;
  notesCount?: number;
  onPress: () => void;
  onMorePress: () => void;
  onNotesPress: () => void;
}

/** Grid card: large cover, progress %, NEW badge, rating, notes icon, ... menu. */
export function BookCard({
  book,
  progress = 0,
  notesCount = 0,
  onPress,
  onMorePress,
  onNotesPress,
}: BookCardProps) {
  const [coverError, setCoverError] = useState(false);
  // Clamp to 0–100 regardless of what's stored (guards against stale data > 1)
  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const isNew = book.status === 'want-to-read' && pct === 0;
  const showCover = book.coverPath && !coverError;

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${book.title}${book.author ? `, by ${book.author}` : ''}`}
      accessibilityHint="Double tap to open"
      className="active:opacity-75"
    >
      {/* Cover */}
      <View
        className="aspect-[2/3] w-full overflow-hidden rounded-xl"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        {showCover ? (
          <Image
            source={{ uri: book.coverPath! }}
            className="h-full w-full"
            resizeMode="cover"
            accessibilityLabel={`Cover of ${book.title}`}
            onError={() => setCoverError(true)}
          />
        ) : (
          <CoverPlaceholder title={book.title} author={book.author} />
        )}

        {/* Notes icon — pencil on notebook, tappable */}
        {notesCount > 0 && (
          <Pressable
            onPress={onNotesPress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="View notes"
            className="absolute top-1.5 right-1.5 active:opacity-60"
          >
            <View className="bg-amber-400 rounded-full w-6 h-6 items-center justify-center">
              <Ionicons name="pencil" size={12} color="#fff" />
            </View>
          </Pressable>
        )}
      </View>

      {/* Info row */}
      <View className="mt-1.5 flex-row items-center justify-between px-0.5">
        <View className="flex-row items-center gap-1.5 flex-1">
          {isNew ? (
            <View className="rounded-full bg-blue-500 px-2 py-0.5">
              <Text className="text-[10px] font-bold text-white">NEW</Text>
            </View>
          ) : (
            <Text className="text-xs font-medium text-gray-500">{pct > 0 ? `${pct}%` : '—'}</Text>
          )}
          {book.rating != null && (
            <View className="flex-row items-center gap-0.5">
              <Text className="text-[10px] text-amber-500">★</Text>
              <Text className="text-[10px] font-semibold text-gray-600">{book.rating}</Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={onMorePress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="More options"
          className="active:opacity-50"
        >
          <Text className="text-base font-bold text-gray-400 leading-none">···</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
