import { and, eq } from 'drizzle-orm';

import { db } from './client';
import { books, bookCategories, type BookInsert, type BookRow } from './schema';

/** Insert a new book record. */
export function insertBook(data: BookInsert): void {
  db.insert(books).values(data).run();
}

/** Get all books ordered by dateAdded desc. */
export function getAllBooks(): BookRow[] {
  return db.select().from(books).orderBy(books.dateAdded).all().reverse();
}

/** Get a single book by id. Returns undefined if not found. */
export function getBookById(id: string): BookRow | undefined {
  return db.select().from(books).where(eq(books.id, id)).get();
}

/** Update mutable fields on a book (status, rating, dateModified). */
export function updateBook(
  id: string,
  data: Partial<
    Pick<BookRow, 'title' | 'author' | 'status' | 'rating' | 'coverPath' | 'dateModified'>
  >,
): void {
  db.update(books).set(data).where(eq(books.id, id)).run();
}

/** Delete a book and cascade to related rows (positions, notes, categories). */
export function deleteBook(id: string): void {
  db.delete(books).where(eq(books.id, id)).run();
}

/** Assign a book to a category (idempotent). */
export function assignCategory(bookId: string, categoryId: string): void {
  db.insert(bookCategories).values({ bookId, categoryId }).onConflictDoNothing().run();
}

/** Remove a book from a category. */
export function removeCategory(bookId: string, categoryId: string): void {
  db.delete(bookCategories)
    .where(and(eq(bookCategories.bookId, bookId), eq(bookCategories.categoryId, categoryId)))
    .run();
}

/**
 * Deduplicate books by filePath — keeps the most recently added record,
 * deletes all others with the same path. Runs synchronously (pure SQL).
 */
export function deduplicateBooks(): void {
  const all = getAllBooks();
  const byPath = new Map<string, BookRow[]>();
  for (const b of all) {
    const arr = byPath.get(b.filePath) ?? [];
    arr.push(b);
    byPath.set(b.filePath, arr);
  }
  for (const group of byPath.values()) {
    if (group.length <= 1) continue;
    // Keep the one with the highest dateAdded; delete the rest
    group.sort((a, b) => b.dateAdded - a.dateAdded);
    for (const stale of group.slice(1)) {
      db.delete(books).where(eq(books.id, stale.id)).run();
    }
  }
}

/** Get all category ids for a book. */
export function getCategoryIdsForBook(bookId: string): string[] {
  return db
    .select({ categoryId: bookCategories.categoryId })
    .from(bookCategories)
    .where(eq(bookCategories.bookId, bookId))
    .all()
    .map((r) => r.categoryId);
}
