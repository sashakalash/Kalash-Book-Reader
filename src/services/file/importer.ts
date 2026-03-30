import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { randomUUID } from 'expo-crypto';

import PdfThumbnail from 'react-native-pdf-thumbnail';

import { insertBook, getAllBooks, deleteBook } from '../db/books';
import { parseEpubMetadata } from './epubMeta';
import type { BookFormat } from '@/types';

// ---------------------------------------------------------------------------
// MIME types
// ---------------------------------------------------------------------------

const SUPPORTED_MIME_TYPES = ['application/epub+zip', 'application/pdf'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportResult {
  bookId: string;
  title: string;
  alreadyExists: boolean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open the system file picker, copy the chosen file to app sandbox,
 * extract metadata, and persist to SQLite.
 *
 * Returns null if the user cancels.
 */
export async function pickAndImportBook(): Promise<ImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: SUPPORTED_MIME_TYPES as unknown as string[],
    copyToCacheDirectory: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  return importBookFromUri(result.assets[0].uri, result.assets[0].name ?? '');
}

/**
 * Import a book from an arbitrary URI (e.g. received via Share intent).
 * Copies the file to app sandbox first.
 */
export async function importBookFromUri(
  sourceUri: string,
  originalName: string,
): Promise<ImportResult> {
  const format = detectFormat(sourceUri, originalName);
  const destDir = `${FileSystem.documentDirectory}books/`;
  const destUri = `${destDir}${sanitizeFilename(originalName)}`;

  // Ensure destination directory exists
  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });

  // Remove all stale duplicate records pointing to the same path
  removeAllByPath(destUri);

  // Check if the file already exists at the destination (e.g. previous import)
  const destInfo = await FileSystem.getInfoAsync(destUri);
  if (!destInfo.exists) {
    await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  }

  // Copy file to sandbox (skip if already present)

  // Extract metadata
  const { title, author, coverBase64 } = await extractMetadata(destUri, originalName, format);

  // Save cover image if present
  const coverPath = coverBase64 ? await saveCoverImage(coverBase64, destDir) : null;

  // Persist to SQLite
  const bookId = randomUUID();
  const now = Date.now();
  insertBook({
    id: bookId,
    title,
    author,
    coverPath,
    filePath: destUri,
    format,
    status: 'want-to-read',
    rating: null,
    dateAdded: now,
    dateModified: now,
  });

  return { bookId, title, alreadyExists: false };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectFormat(uri: string, name: string): BookFormat {
  const lower = (uri + name).toLowerCase();
  if (lower.includes('.epub') || lower.includes('epub')) return 'epub';
  return 'pdf';
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/** Delete ALL book records pointing to the given filePath (deduplication). */
function removeAllByPath(filePath: string): void {
  getAllBooks()
    .filter((b) => b.filePath === filePath)
    .forEach((b) => deleteBook(b.id));
}

async function extractMetadata(
  fileUri: string,
  originalName: string,
  format: BookFormat,
): Promise<{ title: string; author: string | null; coverBase64: string | null }> {
  if (format === 'epub') {
    try {
      return await parseEpubMetadata(fileUri);
    } catch {
      // Fall through to filename-based title
    }
  }
  const title = originalName.replace(/\.(epub|pdf)$/i, '').replace(/_/g, ' ');
  if (format === 'pdf') {
    try {
      const coverBase64 = await extractPdfCover(fileUri);
      return { title, author: null, coverBase64 };
    } catch {
      // Fall through — no cover
    }
  }
  return { title, author: null, coverBase64: null };
}

/** Render first page of a PDF as a JPEG thumbnail. */
async function extractPdfCover(fileUri: string): Promise<string | null> {
  const { uri } = await PdfThumbnail.generate(fileUri, 0);
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
}

async function saveCoverImage(base64DataUri: string, destDir: string): Promise<string> {
  const coverPath = `${destDir}cover_${Date.now()}.jpg`;
  // Strip data URI prefix
  const base64 = base64DataUri.replace(/^data:image\/[^;]+;base64,/, '');
  await FileSystem.writeAsStringAsync(coverPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return coverPath;
}
