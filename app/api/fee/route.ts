// R1 GET /api/fee (Lane A). Source: docs/TDD.md section 7.
import { connection } from 'next/server';
import { getFeePerResponse } from '@/lib/chain/fee';
import type { ApiError } from '@/lib/types';

export async function GET(): Promise<Response> {
  // Read the fee at request time, not at build time.
  await connection();
  try {
    const fee = await getFeePerResponse();
    return Response.json({ feePerResponseWei: fee.toString() });
  } catch (err) {
    console.error('GET /api/fee:', err instanceof Error ? err.message : err);
    const body: ApiError = { error: { code: 'INTERNAL', message: 'The fee is not configured.' } };
    return Response.json(body, { status: 500 });
  }
}
