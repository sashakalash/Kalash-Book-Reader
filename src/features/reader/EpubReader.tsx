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

  const fontFamilyMap: Record<ReaderSettings['fontFamily'], string> = {
    system: '-apple-system, BlinkMacSystemFont, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    'sans-serif': '"Helvetica Neue", Arial, sans-serif',
  };

  const bgMap: Record<ReaderSettings['theme'], string> = {
    day: '#ffffff',
    night: '#1a1a1a',
    sepia: '#f5e6c8',
  };

  const colorMap: Record<ReaderSettings['theme'], string> = {
    day: '#1a1a1a',
    night: '#e0e0e0',
    sepia: '#3b2d1e',
  };

  const theme = {
    body: {
      background: bgMap[settings.theme],
      color: colorMap[settings.theme],
      'font-size': `${settings.fontSize}px`,
      'font-family': fontFamilyMap[settings.fontFamily],
      'line-height': String(settings.lineSpacing),
      'padding-left': `${settings.marginHorizontal}px`,
      'padding-right': `${settings.marginHorizontal}px`,
    },
  };

  return (
    <View style={styles.container}>
      <Reader
        src={fileUri}
        width={undefined as unknown as number} // fills container via flex
        height={undefined as unknown as number}
        fileSystem={useFileSystem}
        defaultTheme={theme}
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
