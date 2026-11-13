import { describe, expect, it } from "vitest";
import { parseSiweMessage, validateSiweMessage } from "viem/siwe";
import { buildSiweMessage } from "./siwe";

const address = "0x2222222222222222222222222222222222222222" as const;

describe("siwe message", () => {
  const now = new Date("2026-11-13T00:00:00Z");
  const msg = buildSiweMessage({ address, nonce: "abcdef0123456789", domain: "localhost:3000", uri: "http://localhost:3000", chainId: 97, now });
  it("round-trips through the parser with domain, chain and nonce", () => {
    const p = parseSiweMessage(msg);
    expect(p).toMatchObject({ address, chainId: 97, nonce: "abcdef0123456789", domain: "localhost:3000" });
  });
  it("is valid now and expires after 10 minutes", () => {
    const p = parseSiweMessage(msg);
    expect(validateSiweMessage({ message: p as never, time: new Date(now.getTime() + 60_000) })).toBe(true);
    expect(validateSiweMessage({ message: p as never, time: new Date(now.getTime() + 11 * 60_000) })).toBe(false);
  });
});
