// Lane C. Query helper on the Neon HTTP driver. Source: docs/TDD.md section 8.
// Server only: never import from a client component.
import { neon, neonConfig } from '@neondatabase/serverless';

type Sql = ReturnType<typeof neon>;

// A local Neon HTTP proxy in front of plain Postgres (Neon's local development setup).
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'db.localtest.me']);
const LOCAL_PROXY_PORT = 4444;

let sql: Sql | null = null;

function getSql(): Sql {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const host = new URL(url).hostname;
  if (LOCAL_HOSTS.has(host)) {
    neonConfig.fetchEndpoint = `http://${host}:${LOCAL_PROXY_PORT}/sql`;
  }
  sql = neon(url);
  return sql;
}

/** Runs one statement with $1, $2 placeholders and returns its rows. */
export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const rows = await getSql().query(text, params);
  return rows as T[];
}

/** True for Postgres error 23505 (unique_violation). */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === '23505';
}
