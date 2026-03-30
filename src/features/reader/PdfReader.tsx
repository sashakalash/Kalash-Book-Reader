import { useEffect, useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Pdf, { type PdfRef } from 'react-native-pdf';
import * as FileSystem from 'expo-file-system/legacy';

import { useReadingPosition } from '@/hooks/useReadingPosition';
import type { ReaderSettings } from '@/types';

const MAX_SAFE_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

interface PdfReaderProps {
  bookId: string;
  fileUri: string;
  flow: ReaderSettings['flow'];
  /** Fires when total page count is known. */
  onPageCountReady?: (total: number) => void;
  /** Fires on every page change — passes current page and total. */
  onPageChange?: (page: number, total: number) => void;
  /** Called when user taps the PDF (for showing/hiding controls). */
  onSingleTap?: () => void;
  /** Ref populated with a function to jump to a specific page. */
  seekRef?: { current: ((page: number) => void) | null };
}

/**
 * PDF reader using react-native-pdf.
 * - Warns the user if the file exceeds 50 MB (OOM risk on Android).
 * - Restores last read page from position store.
 * - Saves page to MMKV on every page change (debounced via useReadingPosition).
 */
export function PdfReader({
  bookId,
  fileUri,
  flow,
  onPageCountReady,
  onPageChange,
  onSingleTap,
  seekRef,
}: PdfReaderProps) {
  const { initialPosition, savePosition } = useReadingPosition(bookId);
  const pdfRef = useRef<PdfRef>(null);
  const warningShown = useRef(false);

  // Populate seekRef so the parent can jump to any page
  useEffect(() => {
    if (seekRef) {
      seekRef.current = (page: number) => {
        pdfRef.current?.setPage(page);
      };
    }
  }, [seekRef]);

  // Warn for large files once
  useEffect(() => {
    if (warningShown.current) return;
    FileSystem.getInfoAsync(fileUri)
      .then((info) => {
        if (
          info.exists &&
          'size' in info &&
          (info as { size: number }).size > MAX_SAFE_FILE_SIZE_BYTES
        ) {
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
        ref={pdfRef}
        source={{ uri: fileUri, cache: true }}
        style={styles.pdf}
        page={initialPage}
        horizontal={flow === 'paginated'}
        enablePaging={flow === 'paginated'}
        fitPolicy={0} // fit width
        onLoadComplete={(numberOfPages) => {
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
        onPageSingleTap={onSingleTap}
        onError={(error) => {
          Alert.alert('PDF error', String(error));
        }}
        trustAllCerts={false}
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
