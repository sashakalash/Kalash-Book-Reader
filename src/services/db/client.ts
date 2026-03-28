import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

/** Singleton SQLite connection. Opens once, reused across the app lifetime. */
const sqlite = openDatabaseSync('kalash-book.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });

export type Database = typeof db;
