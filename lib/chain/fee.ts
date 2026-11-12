// Lane A. MVP: fixed fee from the environment. A live estimate can replace the body later.
// Server only.

export async function getFeePerResponse(): Promise<bigint> {
  const raw = process.env.FEE_PER_RESPONSE_WEI;
  if (!raw || !/^\d+$/.test(raw)) {
    throw new Error('FEE_PER_RESPONSE_WEI is not set to a decimal wei amount');
  }
  return BigInt(raw);
}
