// R2 POST /api/surveys, R3 GET /api/surveys (Lane C). Source: docs/TDD.md section 7.
import { connection } from 'next/server';
import { readJson, respond } from '@/lib/api/errors';
import { listSurveys, registerSurvey } from '@/lib/api/surveys';

export async function POST(request: Request): Promise<Response> {
  return respond(async () => registerSurvey(await readJson(request)));
}

export async function GET(request: Request): Promise<Response> {
  await connection();
  return respond(() => listSurveys(request.headers));
}
