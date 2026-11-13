// Screening details for the researcher's review: code checks, the AI result with the answers it
// flagged, and timing. Read-only; the decision itself is unchanged. Server only.
import { verifyResearcher } from '../auth/signature';
import { getSurvey, listScreeningRecords } from '../db/queries';
import type { AiFlag, AiResultWithFlags } from '../screening/combine';
import type { AiLabel, AiType } from '../types';
import { ApiFailure } from './errors';
import type { ScreeningFlag, ScreeningResponse, ScreeningRow, ScreeningRun } from './shapes';

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

const LABELS: readonly string[] = ['valid', 'unclear', 'non_answer'];
const TYPES: readonly string[] = ['off_question', 'evasive', 'copied', 'other'];
const MAX_REASON = 300;

/** One stored run, checked field by field: it comes back from JSON and goes to the browser. */
function toRun(r: unknown): ScreeningRun {
  const v = r as Record<string, unknown> | null;
  if (!v || typeof v !== 'object' || !LABELS.includes(String(v.label))) return null;
  return {
    label: v.label as AiLabel,
    type: typeof v.type === 'string' && TYPES.includes(v.type) ? (v.type as AiType) : null,
    injection: v.injection === true,
    reason: typeof v.reason === 'string' ? v.reason.slice(0, MAX_REASON) : '',
  };
}

function toFlag(f: AiFlag): ScreeningFlag {
  return {
    questionId: f.questionId,
    label: f.label,
    type: f.type,
    injection: f.injection,
    agreed: f.agreed,
    reason: f.reason,
    runs: Array.isArray(f.runs) && f.runs.length === 2 ? f.runs.map(toRun) : null,
  };
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
            flagged: Array.isArray(ai.flagged) ? ai.flagged.map(toFlag) : null,
          }
        : null,
    };
  });
  return { rows };
}
