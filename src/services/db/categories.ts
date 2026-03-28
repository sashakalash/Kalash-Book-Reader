import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from './client';
import { categories, bookCategories, type CategoryRow } from './schema';

/** Get all categories ordered alphabetically. */
export function getAllCategories(): CategoryRow[] {
  return db.select().from(categories).orderBy(categories.name).all();
}

/** Create a new category. Returns the new id. */
export function createCategory(name: string): string {
  const id = randomUUID();
  db.insert(categories).values({ id, name: name.trim() }).run();
  return id;
}

/** Rename a category. */
export function renameCategory(id: string, name: string): void {
  db.update(categories).set({ name: name.trim() }).where(eq(categories.id, id)).run();
}

/** Delete a category and all its book assignments. */
export function deleteCategory(id: string): void {
  db.delete(categories).where(eq(categories.id, id)).run();
}

/** Get all category ids assigned to a book. */
export function getCategoriesForBook(bookId: string): CategoryRow[] {
  return db
    .select({ id: categories.id, name: categories.name })
    .from(bookCategories)
    .innerJoin(categories, eq(bookCategories.categoryId, categories.id))
    .where(eq(bookCategories.bookId, bookId))
    .all();
}

/** Get all book ids in a category. */
export function getBookIdsForCategory(categoryId: string): string[] {
  return db
    .select({ bookId: bookCategories.bookId })
    .from(bookCategories)
    .where(eq(bookCategories.categoryId, categoryId))
    .all()
    .map((r) => r.bookId);
}
