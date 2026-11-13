// R10 POST /api/surveys/[id]/pause (Lane C). Auth: pause, researcher only. Server-only switch.
import { readJson, respond } from '@/lib/api/errors';
import { parseSurveyId, pauseSurvey } from '@/lib/api/surveys';

// The body is a boolean and one signed proof.
const MAX_BODY_BYTES = 4096;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return respond(async () =>
    pauseSurvey(parseSurveyId((await ctx.params).id), await readJson(request, MAX_BODY_BYTES)),
  );
}
