import { useEffect, useRef } from 'react';
import { Animated, useWindowDimensions, View } from 'react-native';

const COLUMN_WIDTH = 120;
const PADDING = 16;
const GAP = 12;
const ROWS = 2;

function SkeletonCard({ width, shimmer }: { width: number; shimmer: Animated.Value }) {
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const coverHeight = width * 1.5;

  return (
    <Animated.View style={{ width, opacity }}>
      <View style={{ width, height: coverHeight, borderRadius: 8, backgroundColor: '#e5e7eb' }} />
      <View
        style={{
          marginTop: 8,
          height: 12,
          width: width * 0.8,
          borderRadius: 6,
          backgroundColor: '#e5e7eb',
        }}
      />
      <View
        style={{
          marginTop: 4,
          height: 10,
          width: width * 0.55,
          borderRadius: 5,
          backgroundColor: '#f3f4f6',
        }}
      />
    </Animated.View>
  );
}

/** Pulsing placeholder grid shown while library is loading for the first time. */
export function LibrarySkeleton() {
  const { width } = useWindowDimensions();
  const numColumns = Math.max(2, Math.floor((width - PADDING * 2 + GAP) / (COLUMN_WIDTH + GAP)));
  const itemWidth = (width - PADDING * 2 - GAP * (numColumns - 1)) / numColumns;

  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [shimmer]);

  return (
    <View style={{ padding: PADDING, gap: GAP }}>
      {/* eslint-disable react/no-array-index-key */}
      {Array.from({ length: ROWS }).map((_, rowIdx) => (
        <View key={rowIdx} style={{ flexDirection: 'row', gap: GAP }}>
          {Array.from({ length: numColumns }).map((_col, colIdx) => (
            <SkeletonCard key={`${rowIdx}-${colIdx}`} width={itemWidth} shimmer={shimmer} />
          ))}
        </View>
      ))}
      {/* eslint-enable react/no-array-index-key */}
    </View>
  );
}
