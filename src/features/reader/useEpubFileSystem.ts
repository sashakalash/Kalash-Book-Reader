import { useCallback, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Custom fileSystem hook for @epubjs-react-native/core.
 *
 * The library constructs paths as `${documentDirectory}/file.js`, so we strip
 * the trailing slash from documentDirectory to avoid double-slash paths on iOS.
 */
export function useEpubFileSystem() {
  const [file, setFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [size, setSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const downloadFile = useCallback((fromUrl: string, toFile: string) => {
    const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
      const current = Math.round(
        (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100,
      );
      setProgress(current);
    };

    const downloadResumable = FileSystem.createDownloadResumable(
      fromUrl,
      (FileSystem.documentDirectory ?? '') + toFile,
      { cache: true },
      callback,
    );

    setDownloading(true);
    return downloadResumable
      .downloadAsync()
      .then((value) => {
        if (!value) throw new Error('Download failed');
        if (value.headers['Content-Length']) setSize(Number(value.headers['Content-Length']));
        setSuccess(true);
        setError(null);
        setFile(value.uri);
        return { uri: value.uri, mimeType: value.mimeType };
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error downloading file');
        return { uri: null, mimeType: null };
      })
      .finally(() => setDownloading(false));
  }, []);

  const getFileInfo = useCallback(async (fileUri: string) => {
    const info = await FileSystem.getInfoAsync(fileUri);
    return {
      uri: info.uri,
      exists: info.exists,
      isDirectory: info.isDirectory,
      size: info.exists && 'size' in info ? (info as { size: number }).size : 0,
    };
  }, []);

  // Strip trailing slash — Reader.js appends its own "/" before filenames
  const documentDirectory = (FileSystem.documentDirectory ?? '').replace(/\/$/, '');

  return {
    file,
    progress,
    downloading,
    size,
    error,
    success,
    documentDirectory,
    cacheDirectory: FileSystem.cacheDirectory,
    bundleDirectory: undefined,
    readAsStringAsync: FileSystem.readAsStringAsync,
    writeAsStringAsync: FileSystem.writeAsStringAsync,
    deleteAsync: FileSystem.deleteAsync,
    downloadFile,
    getFileInfo,
  };
}
