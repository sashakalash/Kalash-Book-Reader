/**
 * Integration tests for the importer service.
 * Native modules (expo-file-system, expo-document-picker, expo-crypto) are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const insertedBooks: object[] = [];
const allBooks: { id: string; filePath: string; title: string }[] = [];

vi.mock('@/services/db/books', () => ({
  insertBook: (data: object) => insertedBooks.push(data),
  getAllBooks: () => allBooks,
}));

vi.mock('./epubMeta', () => ({
  parseEpubMetadata: vi.fn().mockResolvedValue({
    title: 'Test EPUB',
    author: 'Test Author',
    coverBase64: null,
  }),
}));

vi.mock('expo-file-system', () => ({
  documentDirectory: 'file:///app/',
  makeDirectoryAsync: vi.fn().mockResolvedValue(undefined),
  copyAsync: vi.fn().mockResolvedValue(undefined),
  writeAsStringAsync: vi.fn().mockResolvedValue(undefined),
  readAsStringAsync: vi.fn().mockResolvedValue(''),
  EncodingType: { Base64: 'base64' },
}));

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
}));

vi.mock('expo-document-picker', () => ({
  getDocumentAsync: vi.fn(),
}));

vi.mock('react-native-receive-sharing-intent', () => ({
  default: {
    getReceivedFiles: vi.fn(),
    clearReceivedFiles: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { importBookFromUri, pickAndImportBook } from './importer';
import * as DocumentPicker from 'expo-document-picker';

beforeEach(() => {
  insertedBooks.length = 0;
  allBooks.length = 0;
  vi.clearAllMocks();
});

describe('importBookFromUri', () => {
  it('copies file and inserts EPUB book into SQLite', async () => {
    const result = await importBookFromUri('file:///tmp/sample.epub', 'sample.epub');

    expect(result.bookId).toBe('test-uuid-1234');
    expect(result.title).toBe('Test EPUB');
    expect(result.alreadyExists).toBe(false);
    expect(insertedBooks).toHaveLength(1);

    const inserted = insertedBooks[0] as Record<string, unknown>;
    expect(inserted.format).toBe('epub');
    expect(inserted.status).toBe('want-to-read');
    expect(inserted.rating).toBeNull();
  });

  it('detects PDF format by extension', async () => {
    const result = await importBookFromUri('file:///tmp/report.pdf', 'report.pdf');

    expect(result.alreadyExists).toBe(false);
    const inserted = insertedBooks[0] as Record<string, unknown>;
    expect(inserted.format).toBe('pdf');
  });

  it('uses filename as title for PDF (no metadata parser)', async () => {
    const result = await importBookFromUri('file:///tmp/my_book.pdf', 'my_book.pdf');
    expect(result.title).toBe('my book'); // underscores → spaces, extension stripped
  });

  it('returns alreadyExists=true when file is already in library', async () => {
    allBooks.push({
      id: 'existing-id',
      filePath: 'file:///app/books/sample.epub',
      title: 'Existing',
    });

    const result = await importBookFromUri('file:///tmp/sample.epub', 'sample.epub');

    expect(result.alreadyExists).toBe(true);
    expect(result.bookId).toBe('existing-id');
    expect(insertedBooks).toHaveLength(0);
  });
});

describe('pickAndImportBook', () => {
  it('returns null when user cancels picker', async () => {
    vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
      canceled: true,
      assets: [],
    });

    const result = await pickAndImportBook();
    expect(result).toBeNull();
  });

  it('imports file when user selects a document', async () => {
    vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/chosen.epub',
          name: 'chosen.epub',
          size: 1024,
          mimeType: 'application/epub+zip',
          file: undefined,
          lastModified: undefined,
        },
      ],
    });

    const result = await pickAndImportBook();
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Test EPUB');
  });
});
