// GET /api/surveys/[id]/screening (added). How each response was screened. Auth: view_log, researcher only.
import { connection } from 'next/server';
import { respond } from '@/lib/api/errors';
import { getScreening } from '@/lib/api/screening';
import { parseSurveyId } from '@/lib/api/surveys';

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  await connection();
  return respond(async () => getScreening(parseSurveyId((await ctx.params).id), request.headers));
}
