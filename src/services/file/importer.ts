import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { randomUUID } from 'expo-crypto';

import { insertBook, getAllBooks } from '../db/books';
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

  // Check for duplicate by destination path
  const existing = findExistingByPath(destUri);
  if (existing) {
    return { bookId: existing.id, title: existing.title, alreadyExists: true };
  }

  // Copy file to sandbox
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });

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

function findExistingByPath(filePath: string) {
  return getAllBooks().find((b) => b.filePath === filePath) ?? null;
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
  // PDF or EPUB parse failure — use filename as title
  const title = originalName.replace(/\.(epub|pdf)$/i, '').replace(/_/g, ' ');
  return { title, author: null, coverBase64: null };
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
