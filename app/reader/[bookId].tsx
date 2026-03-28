import { useState, useCallback } from 'react';
import { Pressable, View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useReader, ReaderProvider } from '@epubjs-react-native/core';

import { getBookById } from '@/services/db/books';
import { EpubReader, type EpubTocItem } from '@/features/reader/EpubReader';
import { ReaderControls } from '@/features/reader/ReaderControls';
import { TableOfContents } from '@/features/reader/TableOfContents';
import { useSettingsStore } from '@/stores/settingsStore';

// ---------------------------------------------------------------------------
// Inner reader — needs useReader() so must be inside ReaderProvider
// ---------------------------------------------------------------------------

function ReaderContent({ bookId }: { bookId: string }) {
  const { goToLocation } = useReader();
  const settings = useSettingsStore((s) => s.settings);
  const book = getBookById(bookId);

  const [controlsVisible, setControlsVisible] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);
  const [toc, setToc] = useState<EpubTocItem[]>([]);
  const [progress, setProgress] = useState(0);

  const handleTap = useCallback(() => setControlsVisible((v) => !v), []);

  if (!book) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Book not found</Text>
      </View>
    );
  }

  if (book.format !== 'epub') {
    // PDF handled separately in Phase 6 — placeholder for now
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">PDF reader — Phase 6</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Tap zone wrapper */}
      <Pressable
        onPress={handleTap}
        className="flex-1"
        accessibilityLabel="Tap to show/hide controls"
      >
        <EpubReader
          bookId={bookId}
          fileUri={book.filePath}
          settings={settings}
          onTocReady={setToc}
        />
      </Pressable>

      {/* Overlay controls (tap-to-show) */}
      <ReaderControls
        title={book.title}
        progress={progress}
        onProgressChange={(val) => {
          // epubjs doesn't support direct % navigation — navigate to CFI via percentage
          // For now store and display; deep integration in polish phase
          setProgress(val);
        }}
        onTocPress={() => setTocVisible(true)}
        onSettingsPress={() => {
          /* Phase 7: reader settings */
        }}
        visible={controlsVisible}
      />

      {/* TOC drawer */}
      <TableOfContents
        toc={toc}
        visible={tocVisible}
        onClose={() => setTocVisible(false)}
        onNavigate={(href) => goToLocation(href)}
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

  if (!bookId) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Invalid book ID</Text>
      </View>
    );
  }

  return (
    <ReaderProvider>
      <ReaderContent bookId={bookId} />
    </ReaderProvider>
  );
}
