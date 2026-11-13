// GET /api/me/responses (Lane C, added). The signed-in respondent's own responses. Auth: the sign-in session.
import { connection } from 'next/server';
import { respond } from '@/lib/api/errors';
import { listMyResponses } from '@/lib/api/history';

export async function GET(request: Request): Promise<Response> {
  await connection();
  return respond(() => listMyResponses(request.headers));
}
