import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';

import { getBookById, updateBook } from '@/services/db/books';
import { loadPosition } from '@/services/db/positions';
import { EpubReader, type EpubTocItem } from '@/features/reader/EpubReader';
import { PdfReader } from '@/features/reader/PdfReader';
import { ReaderControls } from '@/features/reader/ReaderControls';
import { ReaderSettings } from '@/features/reader/ReaderSettings';
import { TableOfContents } from '@/features/reader/TableOfContents';
import { ReaderErrorBoundary } from '@/components/ReaderErrorBoundary';
import { useReaderSettings } from '@/hooks/useReaderSettings';

// ---------------------------------------------------------------------------
// EPUB inner — needs useReader() so must live inside ReaderProvider
// ---------------------------------------------------------------------------

function EpubContent({
  bookId,
  filePath,
  title,
}: {
  bookId: string;
  filePath: string;
  title: string;
}) {
  const { settings, update: updateSettings } = useReaderSettings();
  const navigateRef = useRef<((href: string) => void) | null>(null);
  const seekRef = useRef<((pct: number) => void) | null>(null);
  const pageForwardRef = useRef<(() => void) | null>(null);
  const pageBackRef = useRef<(() => void) | null>(null);

  const [controlsVisible, setControlsVisible] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [toc, setToc] = useState<EpubTocItem[]>([]);
  const [progress, setProgress] = useState(() => loadPosition(bookId)?.percentage ?? 0);

  const showTapZones = settings.flow === 'paginated' && !controlsVisible;

  return (
    <View className="flex-1 bg-white">
      <EpubReader
        bookId={bookId}
        fileUri={filePath}
        settings={settings}
        onTocReady={setToc}
        onProgressChange={setProgress}
        onSingleTap={() => setControlsVisible((v) => !v)}
        navigateRef={navigateRef}
        seekRef={seekRef}
        pageForwardRef={pageForwardRef}
        pageBackRef={pageBackRef}
      />

      {/*
        Tap-to-turn page zones for paginated mode.
        Rendered as siblings of EpubReader (not inside it) so they never occlude
        the controls UI. Hidden when controls are visible so burger/gear are tappable.
        Library uses Gesture.Fling() which requires a fast sharp swipe — these
        Pressables provide reliable tap-to-turn for normal casual taps.
      */}
      {showTapZones && (
        <>
          <Pressable
            style={readerStyles.tapZoneLeft}
            onPress={() => pageBackRef.current?.()}
            accessibilityRole="button"
            accessibilityLabel="Previous page"
          />
          <Pressable
            style={readerStyles.tapZoneRight}
            onPress={() => pageForwardRef.current?.()}
            accessibilityRole="button"
            accessibilityLabel="Next page"
          />
        </>
      )}

      <ReaderControls
        title={title}
        progress={progress}
        onProgressChange={(pct) => seekRef.current?.(pct)}
        onTocPress={() => setTocVisible(true)}
        onSettingsPress={() => setSettingsVisible(true)}
        visible={controlsVisible}
      />

      <TableOfContents
        toc={toc}
        visible={tocVisible}
        onClose={() => setTocVisible(false)}
        onNavigate={(href) => navigateRef.current?.(href)}
      />

      <ReaderSettings
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        settings={settings}
        onUpdate={updateSettings}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// PDF inner
// ---------------------------------------------------------------------------

function PdfContent({
  bookId,
  filePath,
  title,
}: {
  bookId: string;
  filePath: string;
  title: string;
}) {
  const { settings, update: updateSettings } = useReaderSettings();
  const [controlsVisible, setControlsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [progress, setProgress] = useState(() => loadPosition(bookId)?.percentage ?? 0);
  const [totalPages, setTotalPages] = useState(0);
  const pdfSeekRef = useRef<((page: number) => void) | null>(null);

  return (
    <View className="flex-1 bg-[#525659]">
      <PdfReader
        bookId={bookId}
        fileUri={filePath}
        flow={settings.flow}
        onPageCountReady={(total) => setTotalPages(total)}
        onPageChange={(page, total) => {
          setProgress(total > 0 ? page / total : 0);
        }}
        onSingleTap={() => setControlsVisible((v) => !v)}
        seekRef={pdfSeekRef}
      />

      <ReaderControls
        title={title}
        progress={progress}
        onProgressChange={(pct) => {
          if (totalPages > 0) {
            const page = Math.max(1, Math.round(pct * totalPages));
            pdfSeekRef.current?.(page);
          }
        }}
        onTocPress={() => {
          /* PDF TOC: future */
        }}
        onSettingsPress={() => setSettingsVisible(true)}
        visible={controlsVisible}
      />

      {/* Settings panel available for PDF too — theme affects chrome, not PDF content */}
      <ReaderSettings
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        settings={settings}
        onUpdate={updateSettings}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/** Unified reader entry point — routes to EPUB or PDF renderer by format. */
export default function ReaderScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const [fileChecked, setFileChecked] = useState(false);
  const [fileMissing, setFileMissing] = useState(false);

  const book = bookId ? getBookById(bookId) : null;

  useEffect(() => {
    if (!book) {
      setFileChecked(true);
      return;
    }
    FileSystem.getInfoAsync(book.filePath).then((info) => {
      setFileMissing(!info.exists);
      setFileChecked(true);
      if (info.exists && book.status === 'want-to-read') {
        updateBook(book.id, { status: 'reading', dateModified: Date.now() });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  if (!bookId) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Invalid book ID</Text>
      </View>
    );
  }

  if (!book) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Book not found</Text>
      </View>
    );
  }

  if (!fileChecked) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="white" />
      </View>
    );
  }

  if (fileMissing) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-8">
        <Ionicons
          name="document-text-outline"
          size={48}
          color="#9ca3af"
          style={{ marginBottom: 16 }}
        />
        <Text className="text-white text-base font-semibold mb-2 text-center">File not found</Text>
        <Text className="text-gray-400 text-sm text-center mb-8">
          &ldquo;{book.title}&rdquo; was removed from device storage outside the app.
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back to library"
          className="rounded-xl bg-white px-6 py-3 active:opacity-70"
        >
          <Text className="text-sm font-semibold text-black">Go back to library</Text>
        </Pressable>
      </View>
    );
  }

  if (book.format === 'epub') {
    return (
      <ReaderErrorBoundary onBack={() => router.back()}>
        <EpubContent bookId={bookId} filePath={book.filePath} title={book.title} />
      </ReaderErrorBoundary>
    );
  }

  return (
    <ReaderErrorBoundary onBack={() => router.back()}>
      <PdfContent bookId={bookId} filePath={book.filePath} title={book.title} />
    </ReaderErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const readerStyles = StyleSheet.create({
  // Transparent tap zones for paginated EPUB — left 25% = prev, right 25% = next.
  // Rendered as siblings of EpubReader so they never block the controls UI.
  // Conditionally shown only when controls are hidden.
  tapZoneLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '25%',
  },
  tapZoneRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '25%',
  },
});
