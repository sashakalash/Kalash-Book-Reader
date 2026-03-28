import { useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useReader, ReaderProvider } from '@epubjs-react-native/core';

import { getBookById } from '@/services/db/books';
import { EpubReader, type EpubTocItem } from '@/features/reader/EpubReader';
import { PdfReader } from '@/features/reader/PdfReader';
import { ReaderControls } from '@/features/reader/ReaderControls';
import { ReaderSettings } from '@/features/reader/ReaderSettings';
import { TableOfContents } from '@/features/reader/TableOfContents';
import { useSettingsStore } from '@/stores/settingsStore';

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
  const { goToLocation } = useReader();
  const settings = useSettingsStore((s) => s.settings);

  const [controlsVisible, setControlsVisible] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [toc, setToc] = useState<EpubTocItem[]>([]);
  const [progress, setProgress] = useState(0);

  return (
    <View className="flex-1 bg-white">
      <Pressable onPress={() => setControlsVisible((v) => !v)} className="flex-1">
        <EpubReader bookId={bookId} fileUri={filePath} settings={settings} onTocReady={setToc} />
      </Pressable>

      <ReaderControls
        title={title}
        progress={progress}
        onProgressChange={setProgress}
        onTocPress={() => setTocVisible(true)}
        onSettingsPress={() => setSettingsVisible(true)}
        visible={controlsVisible}
      />

      <TableOfContents
        toc={toc}
        visible={tocVisible}
        onClose={() => setTocVisible(false)}
        onNavigate={(href) => goToLocation(href)}
      />

      <ReaderSettings visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
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
  const [controlsVisible, setControlsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <View className="flex-1 bg-[#525659]">
      <Pressable onPress={() => setControlsVisible((v) => !v)} className="flex-1">
        <PdfReader
          bookId={bookId}
          fileUri={filePath}
          onPageChange={(page, total) => {
            setProgress(total > 0 ? (page - 1) / total : 0);
          }}
        />
      </Pressable>

      <ReaderControls
        title={title}
        progress={progress}
        onProgressChange={setProgress}
        onTocPress={() => {
          /* PDF TOC: Phase 9 */
        }}
        onSettingsPress={() => setSettingsVisible(true)}
        visible={controlsVisible}
      />

      {/* Settings panel available for PDF too — theme affects chrome, not PDF content */}
      <ReaderSettings visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
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

  const book = getBookById(bookId);

  if (!book) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Book not found</Text>
      </View>
    );
  }

  if (book.format === 'epub') {
    return (
      <ReaderProvider>
        <EpubContent bookId={bookId} filePath={book.filePath} title={book.title} />
      </ReaderProvider>
    );
  }

  return <PdfContent bookId={bookId} filePath={book.filePath} title={book.title} />;
}
