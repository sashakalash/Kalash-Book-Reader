import { ScrollView, Pressable, Text, View } from 'react-native';

import type { ReadingStatus } from '@/types';
import type { CategoryRow } from '@/services/db/schema';

export type SortKey = 'dateAdded' | 'title' | 'rating' | 'progress';

export interface LibraryFilters {
  status: ReadingStatus | null;
  categoryId: string | null;
  sort: SortKey;
}

interface LibraryFilterProps {
  filters: LibraryFilters;
  categories: CategoryRow[];
  onChange: (filters: LibraryFilters) => void;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`rounded-full border px-3 py-1.5 ${
        active ? 'border-blue-500 bg-blue-500' : 'border-gray-200 bg-white'
      }`}
    >
      <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-gray-600'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

const STATUS_CHIPS: { value: ReadingStatus; label: string }[] = [
  { value: 'reading', label: 'Reading' },
  { value: 'want-to-read', label: 'Want' },
  { value: 'finished', label: 'Done' },
];

const SORT_CHIPS: { value: SortKey; label: string }[] = [
  { value: 'dateAdded', label: 'Recent' },
  { value: 'title', label: 'A–Z' },
  { value: 'rating', label: 'Rating' },
  { value: 'progress', label: 'Progress' },
];

/** Horizontal scrollable chip bar for filtering and sorting the library. */
export function LibraryFilter({ filters, categories, onChange }: LibraryFilterProps) {
  const toggleStatus = (s: ReadingStatus) =>
    onChange({ ...filters, status: filters.status === s ? null : s });

  const toggleCategory = (id: string) =>
    onChange({ ...filters, categoryId: filters.categoryId === id ? null : id });

  const setSort = (sort: SortKey) => onChange({ ...filters, sort });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 6 }}
      className="border-b border-gray-100 bg-white"
    >
      {/* Status chips */}
      {STATUS_CHIPS.map((s) => (
        <Chip
          key={s.value}
          label={s.label}
          active={filters.status === s.value}
          onPress={() => toggleStatus(s.value)}
        />
      ))}

      {/* Separator */}
      <View className="w-px bg-gray-200 mx-1 self-stretch" />

      {/* Sort chips */}
      {SORT_CHIPS.map((s) => (
        <Chip
          key={s.value}
          label={s.label}
          active={filters.sort === s.value}
          onPress={() => setSort(s.value)}
        />
      ))}

      {/* Category chips */}
      {categories.length > 0 && (
        <>
          <View className="w-px bg-gray-200 mx-1 self-stretch" />
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              active={filters.categoryId === cat.id}
              onPress={() => toggleCategory(cat.id)}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}
