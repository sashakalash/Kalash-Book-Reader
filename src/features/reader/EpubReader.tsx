import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Reader, useReader, ReaderProvider } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';

import { useReadingPosition } from '@/hooks/useReadingPosition';
import type { ReaderSettings } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EpubTocItem {
  id: string;
  href: string;
  label: string;
  subitems?: EpubTocItem[];
}

interface EpubReaderInnerProps {
  bookId: string;
  fileUri: string;
  settings: ReaderSettings;
  onTocReady: (toc: EpubTocItem[]) => void;
}

// ---------------------------------------------------------------------------
// Inner component — must be inside <ReaderProvider>
// ---------------------------------------------------------------------------

function EpubReaderInner({ bookId, fileUri, settings, onTocReady }: EpubReaderInnerProps) {
  const { goToLocation } = useReader();
  const { initialPosition, savePosition } = useReadingPosition(bookId);
  const didRestore = useRef(false);

  const themeMap: Record<ReaderSettings['theme'], object> = {
    day: { body: { background: '#ffffff', color: '#1a1a1a' } },
    night: { body: { background: '#1a1a1a', color: '#e0e0e0' } },
    sepia: { body: { background: '#f5e6c8', color: '#3b2d1e' } },
  };

  return (
    <View style={styles.container}>
      <Reader
        src={fileUri}
        width={undefined as unknown as number} // fills container via flex
        height={undefined as unknown as number}
        fileSystem={useFileSystem}
        defaultTheme={themeMap[settings.theme]}
        initialLocation={initialPosition?.cfi ?? undefined}
        onReady={(book) => {
          // Restore position once book is ready (fallback: chapter index)
          if (!didRestore.current && initialPosition?.cfi) {
            goToLocation(initialPosition.cfi);
            didRestore.current = true;
          }
          // Expose TOC
          if (book.navigation?.toc) {
            onTocReady(book.navigation.toc as EpubTocItem[]);
          }
        }}
        onLocationChange={(_totalPages, _currentPage, progress, currentLocation) => {
          savePosition({
            cfi: currentLocation?.start?.cfi ?? null,
            chapterIndex: currentLocation?.start?.displayed?.page ?? null,
            percentage: progress ?? 0,
            textAnchor: null,
          });
        }}
        renderLoadingFileComponent={() => null}
        renderOpeningBookComponent={() => null}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Public component — wraps inner with ReaderProvider
// ---------------------------------------------------------------------------

interface EpubReaderProps {
  bookId: string;
  fileUri: string;
  settings: ReaderSettings;
  onTocReady: (toc: EpubTocItem[]) => void;
}

/** EPUB reader using epubjs-react-native (WebView-based, proven fallback). */
export function EpubReader(props: EpubReaderProps) {
  return (
    <ReaderProvider>
      <EpubReaderInner {...props} />
    </ReaderProvider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
