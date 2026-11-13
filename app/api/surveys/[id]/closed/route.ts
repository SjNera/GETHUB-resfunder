// R9 POST /api/surveys/[id]/closed (Lane C). Verified from the Closed event. Safe to repeat.
import { readJson, respond } from '@/lib/api/errors';
import { markSurveyClosed, parseSurveyId } from '@/lib/api/surveys';

// The body is one tx hash.
const MAX_BODY_BYTES = 4096;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return respond(async () =>
    markSurveyClosed(parseSurveyId((await ctx.params).id), await readJson(request, MAX_BODY_BYTES)),
  );
}
