import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { SortKey } from './LibraryFilter';
import type { ReadingStatus } from '@/types';
import type { CategoryRow } from '@/services/db/schema';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'dateAdded', label: 'Recently added' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'rating', label: 'Rating' },
  { value: 'progress', label: 'Progress' },
];

const STATUS_OPTIONS: { value: ReadingStatus | null; label: string }[] = [
  { value: null, label: 'All books' },
  { value: 'reading', label: 'Reading' },
  { value: 'want-to-read', label: 'Want to read' },
  { value: 'finished', label: 'Finished' },
];

interface SortFilterSheetProps {
  visible: boolean;
  sort: SortKey;
  status: ReadingStatus | null;
  categoryFilter: string | null;
  categories: CategoryRow[];
  onSortChange: (sort: SortKey) => void;
  onStatusChange: (status: ReadingStatus | null) => void;
  onCategoryChange: (categoryId: string | null) => void;
  onManageShelves: () => void;
  onClose: () => void;
}

function Row({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3.5 active:bg-gray-50"
    >
      <Text className={`text-base ${active ? 'font-semibold text-blue-600' : 'text-gray-800'}`}>
        {label}
      </Text>
      {active && <Text className="text-blue-500 text-base">✓</Text>}
    </Pressable>
  );
}

/** Bottom sheet for sort, status filter, and shelf filter. */
export function SortFilterSheet({
  visible,
  sort,
  status,
  categoryFilter,
  categories,
  onSortChange,
  onStatusChange,
  onCategoryChange,
  onManageShelves,
  onClose,
}: SortFilterSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />

      <SafeAreaView edges={['bottom']} className="rounded-t-2xl bg-white px-5 pt-3 pb-2">
        <View className="mb-4 self-center h-1 w-10 rounded-full bg-gray-300" />

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Sort by
          </Text>
          <View className="mb-4 divide-y divide-gray-100">
            {SORT_OPTIONS.map((o) => (
              <Row
                key={o.value}
                label={o.label}
                active={sort === o.value}
                onPress={() => {
                  onSortChange(o.value);
                  onClose();
                }}
              />
            ))}
          </View>

          <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Status
          </Text>
          <View className="mb-4 divide-y divide-gray-100">
            {STATUS_OPTIONS.map((o) => (
              <Row
                key={String(o.value)}
                label={o.label}
                active={status === o.value}
                onPress={() => {
                  onStatusChange(o.value);
                  onClose();
                }}
              />
            ))}
          </View>

          {categories.length > 0 && (
            <>
              <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Shelf
              </Text>
              <View className="mb-4 divide-y divide-gray-100">
                <Row
                  label="All shelves"
                  active={categoryFilter === null}
                  onPress={() => {
                    onCategoryChange(null);
                    onClose();
                  }}
                />
                {categories.map((c) => (
                  <Row
                    key={c.id}
                    label={c.name}
                    active={categoryFilter === c.id}
                    onPress={() => {
                      onCategoryChange(c.id);
                      onClose();
                    }}
                  />
                ))}
              </View>
            </>
          )}

          <View className="mt-1 mb-2 h-px bg-gray-100" />
          <Pressable onPress={onManageShelves} className="py-3.5 active:opacity-60">
            <Text className="text-base font-medium text-blue-500">Manage shelves…</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
