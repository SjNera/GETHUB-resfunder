// TEMPORARY validation lab. GET /lab/run?ids=g01,h02 streams one JSON event per line. Delete with app/lab and lib/lab.
import { connection } from 'next/server';
import { labEnabled, runLab } from '@/lib/lab/run';

const PAUSE_MS = Number(process.env.LAB_PAUSE_MS ?? 1500);

export async function GET(request: Request): Promise<Response> {
  await connection();
  if (!labEnabled()) return new Response('Not found', { status: 404 });
  const raw = new URL(request.url).searchParams.get('ids');
  const ids = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 25) : null;

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: unknown) => {
        try {
          controller.enqueue(enc.encode(JSON.stringify(e) + '\n'));
        } catch {
          /* client went away */
        }
      };
      try {
        await runLab(ids, emit, { pauseMs: PAUSE_MS, signal: request.signal });
      } catch (err) {
        emit({ type: 'error', message: err instanceof Error ? err.message : 'Lab run failed.' });
      }
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' } });
}
