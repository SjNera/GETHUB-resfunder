import { describe, expect, it } from "vitest";
import { _call, ApiClientError, authHeaders } from "./api-client";

const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe("api client", () => {
  it("returns the JSON body on 200", async () => {
    const f = (async () => res(200, { feePerResponseWei: "5" })) as typeof fetch;
    expect(await _call("/api/fee", {}, f)).toEqual({ feePerResponseWei: "5" });
  });
  it("turns an ApiError body into an ApiClientError with its code", async () => {
    const f = (async () => res(409, { error: { code: "QUOTA_FULL", message: "Full" } })) as typeof fetch;
    await expect(_call("/x", {}, f)).rejects.toMatchObject({ code: "QUOTA_FULL", status: 409, message: "Full" });
  });
  it("maps a network failure to NETWORK", async () => {
    const f = (async () => { throw new TypeError("fail"); }) as typeof fetch;
    await expect(_call("/x", {}, f)).rejects.toBeInstanceOf(ApiClientError);
  });
  it("sends JSON bodies and auth headers", async () => {
    let seen: RequestInit | undefined;
    const f = (async (_u: string, i?: RequestInit) => { seen = i; return res(200, {}); }) as typeof fetch;
    await _call("/x", { method: "POST", body: { a: 1 }, headers: authHeaders({ wallet: "0xabc", signature: "0xsig", timestamp: 7 }) }, f);
    expect(seen?.body).toBe('{"a":1}');
    expect(seen?.headers).toMatchObject({ "content-type": "application/json", "x-auth-wallet": "0xabc", "x-auth-timestamp": "7" });
  });
});
