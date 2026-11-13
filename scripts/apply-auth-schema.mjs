// Applies lib/db/auth-schema.sql (Better Auth tables) to DATABASE_URL. Run after db:apply: npm run db:apply:auth
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .env.');
  process.exit(1);
}

const sql = await readFile(new URL('../lib/db/auth-schema.sql', import.meta.url), 'utf8');
const pool = new pg.Pool({ connectionString: url });
try {
  await pool.query(sql);
  const { rows } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  console.log('Auth schema applied. Tables:', rows.map((r) => r.table_name).join(', '));
} finally {
  await pool.end();
}
