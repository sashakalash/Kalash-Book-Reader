import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './migrations/migrations';
import { db } from './client';

/** Returns { success, error } — must be awaited in root layout before rendering app content. */
export function useDbMigrations() {
  return useMigrations(db, migrations);
}
