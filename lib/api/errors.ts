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

/** Sent on every API response: never cached (the log holds emails), never sniffed. */
export const API_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

export function errorResponse(code: ErrorCode, message: string): Response {
  const body: ApiError = { error: { code, message } };
  return Response.json(body, { status: STATUS_BY_CODE[code], headers: API_HEADERS });
}

const MAX_ERROR_CHARS = 300;

/**
 * Error text that is safe to log or store: one line, capped, with URLs (an RPC or database URL can
 * carry a key) and 32-byte hex values (the size of a private key) removed.
 */
export function safeErrorText(err: unknown, maxChars: number = MAX_ERROR_CHARS): string {
  const short = (err as { shortMessage?: unknown } | null)?.shortMessage;
  const text = typeof short === 'string' ? short : err instanceof Error ? err.message : String(err);
  return text
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+/gi, '[url]')
    .replace(/(?:0x)?[0-9a-fA-F]{64}/g, '[hex]')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

/** Largest JSON body a route reads. A full survey or 30 long answers fit well inside it. */
export const MAX_BODY_BYTES = 512 * 1024;

function tooLarge(): ApiFailure {
  return new ApiFailure('INVALID_INPUT', 'The request body is too large.');
}

/** Reads the body up to maxBytes and stops reading as soon as it is over. */
async function readCapped(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d{1,15}$/.test(declared) || Number(declared) > maxBytes)) throw tooLarge();
  if (!request.body) return new Uint8Array(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw tooLarge();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Reads a JSON body. The content type must be application/json, the size at most maxBytes, the
 * bytes valid UTF-8, and the value a JSON object. Anything else is INVALID_INPUT.
 */
export async function readJson(request: Request, maxBytes: number = MAX_BODY_BYTES): Promise<unknown> {
  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') {
    throw new ApiFailure('INVALID_INPUT', 'Send the request body as application/json.');
  }
  let bytes: Uint8Array;
  try {
    bytes = await readCapped(request, maxBytes);
  } catch (err) {
    if (err instanceof ApiFailure) throw err;
    throw new ApiFailure('INVALID_INPUT', 'The request body could not be read.');
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new ApiFailure('INVALID_INPUT', 'The request body is not valid JSON.');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiFailure('INVALID_INPUT', 'The request body must be a JSON object.');
  }
  return value;
}

/** Runs a route body and maps the outcome to a JSON response. */
export async function respond(run: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await run(), { headers: API_HEADERS });
  } catch (err) {
    if (err instanceof ApiFailure) return errorResponse(err.code, err.message);
    if (err instanceof ZodError) {
      const issue = err.issues[0];
      const where = issue && issue.path.length > 0 ? `${issue.path.join('.').slice(0, 80)}: ` : '';
      return errorResponse('INVALID_INPUT', issue ? `${where}${issue.message}`.slice(0, 300) : 'Invalid input.');
    }
    // Scrubbed message only. Never log request bodies or secrets.
    console.error('API error:', safeErrorText(err));
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
