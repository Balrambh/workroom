import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(process.env.DB_PATH ?? resolve(here, '../data/roomforge.db'));
const backupDir = resolve(process.env.BACKUP_DIR ?? resolve(here, '../backups'));

if (!existsSync(source)) {
  console.error(`Database not found: ${source}`);
  process.exit(1);
}

mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = resolve(backupDir, `roomforge-${stamp}.db`);

const db = new DatabaseSync(source, { readOnly: true });
try {
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
} finally {
  db.close();
}

console.log(target);
