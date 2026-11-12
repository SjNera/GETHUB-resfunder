// Applies lib/db/schema.sql to DATABASE_URL (Neon). Run once: npm run db:apply
import { readFile } from 'node:fs/promises';
import { Pool } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .env.');
  process.exit(1);
}

const sql = await readFile(new URL('../lib/db/schema.sql', import.meta.url), 'utf8');
const pool = new Pool({ connectionString: url });
try {
  await pool.query(sql);
  const { rows } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  console.log('Schema applied. Tables:', rows.map((r) => r.table_name).join(', '));
} finally {
  await pool.end();
}
