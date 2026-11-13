// Browser-side client for the API routes (TDD section 7). Shapes come from lib/api/shapes.ts.
import type { ClosedResult, HistoryItem, LogResponse, OpenSurvey, RegisterResult, ResponseResult, SubmitResult, SurveyDetails, SurveySummary } from "@/lib/api/shapes";
import type { Answers, ApiError, AuthProof, ErrorCode, Hex, SurveyJson, WeiString } from "@/lib/types";

export class ApiClientError extends Error {
  constructor(
    public code: ErrorCode | "NETWORK",
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type Init = { method?: "GET" | "POST" | "PUT"; body?: unknown; headers?: Record<string, string> };

export function authHeaders(p: AuthProof): Record<string, string> {
  return { "x-auth-wallet": p.wallet, "x-auth-signature": p.signature, "x-auth-timestamp": String(p.timestamp) };
}

async function call<T>(path: string, init: Init = {}, fetcher: typeof fetch = fetch): Promise<T> {
  let res: Response;
  try {
    res = await fetcher(path, {
      method: init.method ?? "GET",
      headers: { ...(init.body !== undefined ? { "content-type": "application/json" } : {}), ...init.headers },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError("NETWORK", "Can't reach the server. Check your connection and try again.");
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const e = (data as ApiError | null)?.error;
    throw new ApiClientError(e?.code ?? "INTERNAL", e?.message ?? "Something went wrong.", res.status);
  }
  return data as T;
}

export const api = {
  fee: () => call<{ feePerResponseWei: WeiString }>("/api/fee"),
  register: (txHash: Hex, survey: SurveyJson) => call<RegisterResult>("/api/surveys", { method: "POST", body: { txHash, survey } }),
  list: (proof?: AuthProof) => call<{ surveys: SurveySummary[] }>("/api/surveys", { headers: proof ? authHeaders(proof) : {} }),
  decide: (responseId: string, decision: "pay" | "dont_pay", reason?: string) =>
    call<ResponseResult>(`/api/responses/${encodeURIComponent(responseId)}/decide`, { method: "POST", body: { decision, reason } }),
  saveProfile: (profile: Record<string, unknown>) =>
    call<{ saved: true }>("/api/me/profile", { method: "PUT", body: { profile } }),
  open: () => call<{ surveys: OpenSurvey[] }>("/api/surveys/open"),
  myResponses: () => call<{ responses: HistoryItem[] }>("/api/me/responses"),
  survey: (id: number) => call<SurveyDetails>(`/api/surveys/${id}`),
  submit: (b: { surveyId: number; email: string; answers: Answers; startedAt: number; auth: AuthProof }) =>
    call<SubmitResult>("/api/submit", { method: "POST", body: b }),
  process: (responseId: string) => call<ResponseResult>(`/api/process/${encodeURIComponent(responseId)}`, { method: "POST" }),
  response: (responseId: string) => call<ResponseResult>(`/api/responses/${encodeURIComponent(responseId)}`),
  log: (id: number, proof?: AuthProof) => call<LogResponse>(`/api/surveys/${id}/log`, { headers: proof ? authHeaders(proof) : {} }),
  pause: (id: number, paused: boolean, auth: AuthProof) =>
    call<{ surveyId: number; paused: boolean }>(`/api/surveys/${id}/pause`, { method: "POST", body: { paused, auth } }),
  closed: (id: number, txHash: Hex) => call<ClosedResult>(`/api/surveys/${id}/closed`, { method: "POST", body: { txHash } }),
};

/** For tests: the same calls with an injected fetch. */
export const _call = call;
