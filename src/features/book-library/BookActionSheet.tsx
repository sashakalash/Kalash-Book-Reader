import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Book, ReadingStatus } from '@/types';

interface BookActionSheetProps {
  book: Book | null;
  onClose: () => void;
  onDelete: (book: Book) => void;
  onStatusChange: (book: Book, status: ReadingStatus) => void;
  onRatingChange: (book: Book, rating: number | null) => void;
  onNotesPress: (book: Book) => void;
  onCategoriesPress: (book: Book) => void;
}

const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: 'want-to-read', label: 'Want to read' },
  { value: 'reading', label: 'Currently reading' },
  { value: 'finished', label: 'Finished' },
];

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Bottom-sheet modal: status, rating 1–10, notes, categories, delete. */
export function BookActionSheet({
  book,
  onClose,
  onDelete,
  onStatusChange,
  onRatingChange,
  onNotesPress,
  onCategoriesPress,
}: BookActionSheetProps) {
  if (!book) return null;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        className="flex-1 bg-black/40"
        onPress={onClose}
        accessibilityLabel="Close menu"
        accessibilityRole="button"
      />

      <SafeAreaView edges={['bottom']} className="rounded-t-2xl bg-white px-4 pt-3">
        {/* Handle */}
        <View className="mb-3 self-center h-1 w-10 rounded-full bg-gray-300" />

        {/* Title */}
        <Text className="mb-4 text-base font-bold text-gray-900" numberOfLines={1}>
          {book.title}
        </Text>

        {/* Status */}
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Reading status
        </Text>
        {STATUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => {
              onStatusChange(book, opt.value);
              onClose();
            }}
            accessibilityRole="button"
            className="flex-row items-center py-2.5 active:bg-gray-50"
          >
            <View
              className={`mr-3 h-4 w-4 rounded-full border-2 ${
                book.status === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
              }`}
            />
            <Text
              className={`text-base ${book.status === opt.value ? 'font-semibold text-blue-600' : 'text-gray-800'}`}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}

        {/* Rating */}
        <View className="my-3 h-px bg-gray-100" />
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Rating
        </Text>
        <View className="flex-row gap-1.5 mb-1">
          {RATINGS.map((n) => {
            const active = book.rating === n;
            return (
              <Pressable
                key={n}
                onPress={() => onRatingChange(book, active ? null : n)}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${n}`}
                className={`flex-1 items-center rounded-lg py-2 ${active ? 'bg-blue-500' : 'bg-gray-100'}`}
              >
                <Text
                  className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-600'}`}
                >
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Notes + Categories */}
        <View className="my-3 h-px bg-gray-100" />
        <Pressable
          onPress={() => {
            onNotesPress(book);
            onClose();
          }}
          accessibilityRole="button"
          className="flex-row items-center justify-between py-3 active:bg-gray-50"
        >
          <Text className="text-base text-gray-800">Notes</Text>
          <Text className="text-sm text-gray-400">›</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            onCategoriesPress(book);
            onClose();
          }}
          accessibilityRole="button"
          className="flex-row items-center justify-between py-3 active:bg-gray-50"
        >
          <Text className="text-base text-gray-800">Shelves</Text>
          <Text className="text-sm text-gray-400">›</Text>
        </Pressable>

        {/* Delete */}
        <View className="my-3 h-px bg-gray-100" />
        <Pressable
          onPress={() => {
            onDelete(book);
            onClose();
          }}
          accessibilityRole="button"
          className="py-3 active:bg-red-50"
        >
          <Text className="text-base font-semibold text-red-500">Delete book</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}
