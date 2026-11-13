// Screening details for the researcher's review: code checks, the AI result with the answers it
// flagged, and timing. Read-only; the decision itself is unchanged. Server only.
import { verifyResearcher } from '../auth/signature';
import { getSurvey, listScreeningRecords } from '../db/queries';
import type { AiResultWithFlags } from '../screening/combine';
import { ApiFailure } from './errors';
import type { ScreeningResponse, ScreeningRow } from './shapes';

const MIN_PRIOR_FOR_MEDIAN = 10;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/** The "too fast" line as lib/screening/checks.ts drew it for a response, from the ones before it. */
export function fastLineMs(priorDurationsMs: number[], questionCount: number): number {
  return priorDurationsMs.length >= MIN_PRIOR_FOR_MEDIAN ? 0.5 * median(priorDurationsMs) : 2000 * questionCount;
}

export async function getScreening(surveyId: number, headers: Headers): Promise<ScreeningResponse> {
  const found = await getSurvey(surveyId);
  if (!found) throw new ApiFailure('SURVEY_NOT_FOUND', 'Survey not found.');
  const wallet = await verifyResearcher(headers, 'view_log', surveyId);
  if (wallet !== found.researcher) throw new ApiFailure('NOT_YOUR_SURVEY', 'This survey belongs to another wallet.');

  const records = await listScreeningRecords(surveyId);
  const questionCount = found.survey.questions.length;
  const durations = new Map(records.map((r) => [r.responseId, Math.max(0, r.submittedAt.getTime() - r.startedAt.getTime())]));
  const oldestFirst = [...records].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  const lines = new Map<string, number>();
  oldestFirst.forEach((r, i) => {
    lines.set(r.responseId, fastLineMs(oldestFirst.slice(0, i).map((p) => durations.get(p.responseId) ?? 0), questionCount));
  });

  const rows: ScreeningRow[] = records.map((r) => {
    const ai = r.ai as AiResultWithFlags | null;
    return {
      responseId: r.responseId,
      durationMs: durations.get(r.responseId) ?? 0,
      fastLineMs: lines.get(r.responseId) ?? 0,
      screened: r.signals !== null,
      hardFails: r.signals?.hardFails ?? [],
      weak: r.signals?.weak ?? [],
      ai: ai
        ? {
            label: ai.label,
            type: ai.type,
            injection: ai.injection,
            agreed: ai.agreed,
            reason: ai.reason,
            flagged: Array.isArray(ai.flagged) ? ai.flagged : null,
          }
        : null,
    };
  });
  return { rows };
}
