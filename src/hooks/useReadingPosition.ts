import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  savePositionToMmkv,
  flushBookPositionOnBackground,
  loadPosition,
  type PositionUpdate,
} from '@/services/db/positions';
import type { ReadingPosition } from '@/types';

const DEBOUNCE_MS = 2000;
const PERIODIC_FLUSH_MS = 30_000;

/**
 * Manages reading position persistence for a single book.
 *
 * - Writes to MMKV on every page change (debounced, 2 s).
 * - Flushes to SQLite when app goes to background.
 * - Flushes to SQLite every 30 s (periodic sync).
 *
 * Returns the initial position to restore + a `savePosition` callback.
 */
export function useReadingPosition(bookId: string): {
  initialPosition: ReadingPosition | null;
  savePosition: (update: PositionUpdate) => void;
} {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodicTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load initial position once
  const initialPosition = loadPosition(bookId) as ReadingPosition | null;

  // Debounced save to MMKV
  const savePosition = useCallback(
    (update: PositionUpdate) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        savePositionToMmkv(bookId, update);
      }, DEBOUNCE_MS);
    },
    [bookId],
  );

  // AppState listener — flush to SQLite on background
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
          debounceTimer.current = null;
        }
        flushBookPositionOnBackground(bookId);
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [bookId]);

  // Periodic flush every 30 s
  useEffect(() => {
    periodicTimer.current = setInterval(() => {
      flushBookPositionOnBackground(bookId);
    }, PERIODIC_FLUSH_MS);

    return () => {
      if (periodicTimer.current) clearInterval(periodicTimer.current);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      // Final flush on unmount
      flushBookPositionOnBackground(bookId);
    };
  }, [bookId]);

  return { initialPosition, savePosition };
}
