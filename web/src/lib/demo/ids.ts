/** Random ids and simulated chain values for demo mode. */

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const fakeTxHash = () => `0x${randomHex(32)}` as `0x${string}`;
export const fakeAddress = () => `0x${randomHex(20)}` as `0x${string}`;
export const newId = (prefix: string) => `${prefix}-${randomHex(4)}`;
