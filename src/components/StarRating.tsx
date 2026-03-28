import { Pressable, View } from 'react-native';
import { Text } from 'react-native';

interface StarRatingProps {
  value: number | null; // 1–5, null = unrated
  onChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' };

/** Interactive 5-star rating. Tapping the current star clears the rating. */
export function StarRating({ value, onChange, size = 'md' }: StarRatingProps) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(value === star ? 0 : star)}
          accessibilityRole="button"
          accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
          accessibilityState={{ selected: value !== null && value >= star }}
          className="active:scale-110 p-0.5"
        >
          <Text className={SIZE_CLASS[size]}>{value !== null && value >= star ? '★' : '☆'}</Text>
        </Pressable>
      ))}
    </View>
  );
}
