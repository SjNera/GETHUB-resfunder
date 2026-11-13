// GET /api/surveys/open (Lane C, added). Public list of surveys that accept answers now.
import { connection } from 'next/server';
import { respond } from '@/lib/api/errors';
import { listOpen } from '@/lib/api/surveys';

export async function GET(): Promise<Response> {
  await connection();
  return respond(() => listOpen());
}
