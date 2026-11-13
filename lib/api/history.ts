// A signed-in respondent's own responses: what happened to each answer and where the payout went. Server only.
import { requireSession } from '../auth/session';
import { listResponsesByWallet } from '../db/queries';
import { explorerUrl, type HistoryItem } from './shapes';

export async function listMyResponses(headers: Headers): Promise<{ responses: HistoryItem[] }> {
  const me = await requireSession(headers);
  const rows = await listResponsesByWallet(me.wallet);
  return {
    responses: rows.map(({ response, surveyTitle, rateWei, decision, appeal }) => ({
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
      appeal,
      // A rejection by the researcher is saved off chain, so the contract still allows a payment later.
      canAppeal: appeal === null && response.status === 'blocked' && decision?.result === 'dont_pay' && decision.status === 'off_chain',
    })),
  };
}
