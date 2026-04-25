import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import { runMigrations } from './migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve to repo root: backend/src/db -> ../../.. -> repo root
const dbPath = path.resolve(__dirname, '..', '..', '..', 'data', 'queuer.db');

const db = new Database(dbPath);

runMigrations(db);

export default db;
