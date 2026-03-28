import { int, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// books
// ---------------------------------------------------------------------------

export const books = sqliteTable('books', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author'),
  coverPath: text('cover_path'),
  filePath: text('file_path').notNull(),
  /** 'epub' | 'pdf' */
  format: text('format').notNull(),
  /** 'want-to-read' | 'reading' | 'finished' */
  status: text('status').notNull().default('want-to-read'),
  /** 1–5, null = unrated */
  rating: int('rating'),
  dateAdded: int('date_added').notNull(),
  dateModified: int('date_modified').notNull(),
});

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

// ---------------------------------------------------------------------------
// book_categories (many-to-many)
// ---------------------------------------------------------------------------

export const bookCategories = sqliteTable('book_categories', {
  bookId: text('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
});

// ---------------------------------------------------------------------------
// notes
// ---------------------------------------------------------------------------

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  bookId: text('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: int('created_at').notNull(),
  updatedAt: int('updated_at').notNull(),
});

// ---------------------------------------------------------------------------
// reading_positions
// ---------------------------------------------------------------------------

export const readingPositions = sqliteTable('reading_positions', {
  bookId: text('book_id')
    .primaryKey()
    .references(() => books.id, { onDelete: 'cascade' }),
  /** Canonical Fragment Identifier (EPUB only). */
  cfi: text('cfi'),
  /** Chapter index as CFI fallback. */
  chapterIndex: int('chapter_index'),
  /** Page number (PDF only). */
  page: int('page'),
  /** 0–1 read percentage. */
  percentage: real('percentage').notNull().default(0),
  /** Short text anchor as final CFI fallback. */
  textAnchor: text('text_anchor'),
  updatedAt: int('updated_at').notNull(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type BookRow = typeof books.$inferSelect;
export type BookInsert = typeof books.$inferInsert;
export type CategoryRow = typeof categories.$inferSelect;
export type NoteRow = typeof notes.$inferSelect;
export type NoteInsert = typeof notes.$inferInsert;
export type ReadingPositionRow = typeof readingPositions.$inferSelect;
export type ReadingPositionInsert = typeof readingPositions.$inferInsert;
