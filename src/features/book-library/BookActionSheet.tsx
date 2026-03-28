import { Modal, Pressable, Text, View } from 'react-native';

import type { Book, ReadingStatus } from '@/types';

interface BookActionSheetProps {
  book: Book | null;
  onClose: () => void;
  onDelete: (book: Book) => void;
  onStatusChange: (book: Book, status: ReadingStatus) => void;
}

const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: 'want-to-read', label: 'Want to read' },
  { value: 'reading', label: 'Currently reading' },
  { value: 'finished', label: 'Finished' },
];

/** Bottom-sheet style modal for book actions (long press). */
export function BookActionSheet({ book, onClose, onDelete, onStatusChange }: BookActionSheetProps) {
  if (!book) return null;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      {/* Backdrop */}
      <Pressable
        className="flex-1 bg-black/40"
        onPress={onClose}
        accessibilityLabel="Close menu"
        accessibilityRole="button"
      />

      {/* Sheet */}
      <View className="rounded-t-2xl bg-white px-4 pb-10 pt-3">
        {/* Handle */}
        <View className="mb-4 self-center h-1 w-10 rounded-full bg-gray-300" />

        {/* Book title */}
        <Text className="mb-4 text-base font-bold text-gray-900" numberOfLines={1}>
          {book.title}
        </Text>

        {/* Status options */}
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
            accessibilityLabel={`Mark as ${opt.label}`}
            className="flex-row items-center py-3 active:bg-gray-50"
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

        {/* Divider */}
        <View className="my-3 h-px bg-gray-100" />

        {/* Delete */}
        <Pressable
          onPress={() => {
            onDelete(book);
            onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel="Delete book"
          className="py-3 active:bg-red-50"
        >
          <Text className="text-base font-semibold text-red-500">Delete book</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
