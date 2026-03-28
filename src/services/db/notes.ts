import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import { db } from './client';
import { notes, type NoteRow, type NoteInsert } from './schema';

/** Get all notes for a book ordered by newest first. */
export function getNotesForBook(bookId: string): NoteRow[] {
  return db
    .select()
    .from(notes)
    .where(eq(notes.bookId, bookId))
    .orderBy(desc(notes.createdAt))
    .all();
}

/** Create a new note. Returns the new id. */
export function createNote(bookId: string, text: string): string {
  const id = randomUUID();
  const now = Date.now();
  const row: NoteInsert = { id, bookId, text: text.trim(), createdAt: now, updatedAt: now };
  db.insert(notes).values(row).run();
  return id;
}

/** Update note text. */
export function updateNote(id: string, text: string): void {
  db.update(notes).set({ text: text.trim(), updatedAt: Date.now() }).where(eq(notes.id, id)).run();
}

/** Delete a note. */
export function deleteNote(id: string): void {
  db.delete(notes).where(eq(notes.id, id)).run();
}
