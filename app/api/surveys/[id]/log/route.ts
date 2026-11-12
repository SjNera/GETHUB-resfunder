// R8 GET /api/surveys/[id]/log (Lane C). Auth: view_log, researcher only.
import { connection } from 'next/server';
import { respond } from '@/lib/api/errors';
import { getLog } from '@/lib/api/log';
import { parseSurveyId } from '@/lib/api/surveys';

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  await connection();
  return respond(async () => getLog(parseSurveyId((await ctx.params).id), request.headers));
}
