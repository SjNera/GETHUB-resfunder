// R9 POST /api/surveys/[id]/closed (Lane C). Verified from the Closed event. Safe to repeat.
import { readJson, respond } from '@/lib/api/errors';
import { markSurveyClosed, parseSurveyId } from '@/lib/api/surveys';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return respond(async () => markSurveyClosed(parseSurveyId((await ctx.params).id), await readJson(request)));
}
