// R4 GET /api/surveys/[id] (Lane C). Public, for the respondent page.
import { connection } from 'next/server';
import { respond } from '@/lib/api/errors';
import { getSurveyDetails, parseSurveyId } from '@/lib/api/surveys';

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  await connection();
  return respond(async () => getSurveyDetails(parseSurveyId((await ctx.params).id)));
}
