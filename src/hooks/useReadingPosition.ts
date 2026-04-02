import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  savePositionToMmkv,
  flushBookPositionOnBackground,
  flushPositionToSqlite,
  loadPosition,
  type PositionUpdate,
} from '@/services/db/positions';
import type { ReadingPosition } from '@/types';

const PERIODIC_FLUSH_MS = 30_000;

/**
 * Manages reading position persistence for a single book.
 *
 * - Writes to MMKV on every page change (immediate, < 1 ms).
 * - Flushes to SQLite when app goes to background.
 * - Flushes to SQLite every 30 s (periodic sync).
 *
 * Returns the initial position to restore + a `savePosition` callback.
 */
export function useReadingPosition(bookId: string): {
  initialPosition: ReadingPosition | null;
  savePosition: (update: PositionUpdate) => void;
} {
  const periodicTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load initial position once
  const initialPosition = loadPosition(bookId) as ReadingPosition | null;

  // Track latest update so unmount can flush it even if debounce hasn't fired
  const latestUpdate = useRef<PositionUpdate | null>(null);

  // Save to MMKV immediately — writes are < 1 ms (memory-mapped).
  // No debounce so the library screen always reads fresh data when it
  // focuses before the reader unmounts.
  const savePosition = useCallback(
    (update: PositionUpdate) => {
      latestUpdate.current = update;
      savePositionToMmkv(bookId, update);
    },
    [bookId],
  );

  // AppState listener — flush to SQLite on background
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
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
      // Flush latest position directly to both MMKV and SQLite on unmount
      // so the library screen shows up-to-date progress immediately.
      if (latestUpdate.current) {
        savePositionToMmkv(bookId, latestUpdate.current);
        flushPositionToSqlite(bookId, latestUpdate.current);
      } else {
        flushBookPositionOnBackground(bookId);
      }
    };
  }, [bookId]);

  return { initialPosition, savePosition };
}
