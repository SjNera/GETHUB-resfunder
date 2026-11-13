// R5 POST /api/submit (Lane C). Auth: submit proof in the body.
import { readJson, respond } from '@/lib/api/errors';
import { submitResponse } from '@/lib/api/submit';

export async function POST(request: Request): Promise<Response> {
  return respond(async () => submitResponse(await readJson(request)));
}
