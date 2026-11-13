// A signed-in respondent's own responses: what happened to each answer and where the payout went. Server only.
import { requireSession } from '../auth/session';
import { listResponsesByWallet } from '../db/queries';
import { explorerUrl, type HistoryItem } from './shapes';

export async function listMyResponses(headers: Headers): Promise<{ responses: HistoryItem[] }> {
  const me = await requireSession(headers);
  const rows = await listResponsesByWallet(me.wallet);
  return {
    responses: rows.map(({ response, surveyTitle, rateWei, decision }) => ({
      responseId: response.id,
      surveyId: response.surveyId,
      surveyTitle,
      rateWei: rateWei.toString(),
      submittedAt: response.submittedAt.toISOString(),
      status: response.status,
      result: decision?.result ?? null,
      reasons: decision?.reasons ?? [],
      txHash: decision?.txHash ?? null,
      explorerUrl: explorerUrl(decision?.txHash ?? null),
    })),
  };
}
