// Lane C. API errors and the route wrapper. Source: docs/TDD.md sections 4 and 7.
import { ZodError } from 'zod';
import type { ApiError, ErrorCode } from '../types';

export const STATUS_BY_CODE: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  WALLET_NOT_VERIFIED: 401,
  NOT_YOUR_SURVEY: 403,
  SURVEY_NOT_FOUND: 404,
  RESPONSE_NOT_FOUND: 404,
  ALREADY_SUBMITTED: 409,
  SURVEY_CLOSED: 409,
  SURVEY_PAUSED: 409,
  QUOTA_FULL: 409,
  TX_NOT_VERIFIED: 422,
  HASH_MISMATCH: 422,
  INTERNAL: 500,
};

/** Thrown by lib code. The route wrapper turns it into an ApiError response. */
export class ApiFailure extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'ApiFailure';
    this.code = code;
  }
}

export function errorResponse(code: ErrorCode, message: string): Response {
  const body: ApiError = { error: { code, message } };
  return Response.json(body, { status: STATUS_BY_CODE[code] });
}

/** Reads a JSON body. Bad JSON is INVALID_INPUT. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiFailure('INVALID_INPUT', 'The request body is not valid JSON.');
  }
}

/** Runs a route body and maps the outcome to a JSON response. */
export async function respond(run: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await run());
  } catch (err) {
    if (err instanceof ApiFailure) return errorResponse(err.code, err.message);
    if (err instanceof ZodError) {
      const issue = err.issues[0];
      const where = issue && issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return errorResponse('INVALID_INPUT', issue ? `${where}${issue.message}` : 'Invalid input.');
    }
    // Message only. Never log request bodies or secrets.
    console.error('API error:', err instanceof Error ? err.message : String(err));
    return errorResponse('INTERNAL', 'Something went wrong. Try again.');
  }
}

/** Parses a response id path segment. Ids are UUIDs. */
export function parseResponseId(raw: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    throw new ApiFailure('INVALID_INPUT', 'The response id is not valid.');
  }
  return raw.toLowerCase();
}
