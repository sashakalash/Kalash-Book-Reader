/** Supported book formats in MVP. */
export type BookFormat = 'epub' | 'pdf';

/** Reading status for library organisation. */
export type ReadingStatus = 'want-to-read' | 'reading' | 'finished';

/** Book record as stored in SQLite. */
export interface Book {
  id: string;
  title: string;
  author: string | null;
  coverPath: string | null;
  filePath: string;
  format: BookFormat;
  status: ReadingStatus;
  rating: number | null; // 1–5, null = unrated
  dateAdded: number; // Unix timestamp ms
  dateModified: number;
}

/** Category record. */
export interface Category {
  id: string;
  name: string;
}

/** Note attached to a book. */
export interface Note {
  id: string;
  bookId: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

/** Reading position stored per book. CFI is EPUB-specific; page is PDF-specific. */
export interface ReadingPosition {
  bookId: string;
  /** Canonical Fragment Identifier (EPUB only). */
  cfi: string | null;
  /** Chapter index as fallback if CFI resolves incorrectly. */
  chapterIndex: number | null;
  /** Page number (PDF only). */
  page: number | null;
  /** 0–1 read percentage for both formats. */
  percentage: number;
  /** Short text anchor as final CFI fallback. */
  textAnchor: string | null;
  updatedAt: number;
}

/** App-wide reader preferences stored in MMKV. */
export interface ReaderSettings {
  theme: 'day' | 'night' | 'sepia';
  fontSize: number; // 12–24
  fontFamily: 'system' | 'serif' | 'sans-serif';
  lineSpacing: number; // 1.0–2.0
  marginHorizontal: number; // 0–48
}
