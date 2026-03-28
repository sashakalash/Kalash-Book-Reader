import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Pdf from 'react-native-pdf';
import * as FileSystem from 'expo-file-system';

import { useReadingPosition } from '@/hooks/useReadingPosition';

const MAX_SAFE_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

interface PdfReaderProps {
  bookId: string;
  fileUri: string;
  /** Fires when total page count is known. */
  onPageCountReady?: (total: number) => void;
  /** Fires on every page change — passes current page and total. */
  onPageChange?: (page: number, total: number) => void;
}

/**
 * PDF reader using react-native-pdf.
 * - Warns the user if the file exceeds 50 MB (OOM risk on Android).
 * - Restores last read page from position store.
 * - Saves page to MMKV on every page change (debounced via useReadingPosition).
 */
export function PdfReader({ bookId, fileUri, onPageCountReady, onPageChange }: PdfReaderProps) {
  const { initialPosition, savePosition } = useReadingPosition(bookId);
  const [, setTotalPages] = useState(0);
  const warningShown = useRef(false);

  // Warn for large files once
  useEffect(() => {
    if (warningShown.current) return;
    FileSystem.getInfoAsync(fileUri, { size: true })
      .then((info) => {
        if (info.exists && 'size' in info && info.size > MAX_SAFE_FILE_SIZE_BYTES) {
          warningShown.current = true;
          Alert.alert(
            'Large file',
            'This PDF is over 50 MB. It may load slowly or cause memory issues on some devices.',
            [{ text: 'OK' }],
          );
        }
      })
      .catch(() => {
        // Non-critical — ignore
      });
  }, [fileUri]);

  const initialPage = initialPosition?.page ?? 1;

  return (
    <View style={styles.container}>
      <Pdf
        source={{ uri: fileUri, cache: true }}
        style={styles.pdf}
        page={initialPage}
        // Virtualized rendering — only renders pages near the viewport
        enablePaging
        horizontal={false}
        fitPolicy={0} // fit width
        onLoadComplete={(numberOfPages) => {
          setTotalPages(numberOfPages);
          onPageCountReady?.(numberOfPages);
        }}
        onPageChanged={(page, numberOfPages) => {
          onPageChange?.(page, numberOfPages);
          const percentage = numberOfPages > 0 ? (page - 1) / numberOfPages : 0;
          savePosition({
            page,
            percentage,
            cfi: null,
            chapterIndex: null,
            textAnchor: null,
          });
        }}
        onError={(error) => {
          Alert.alert('PDF error', String(error));
        }}
        activityIndicator={undefined}
        trustAllCerts={false}
        accessibilityLabel="PDF document"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#525659',
  },
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
