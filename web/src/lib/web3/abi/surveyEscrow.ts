/**
 * STUB — replace with the real ABI from Remix (Solidity compiler tab → ABI),
 * keeping `as const`. The budget is the mock tPHP ERC-20: the researcher first
 * approves the escrow for rate × quota + 5% fee, then createSurvey pulls it
 * with transferFrom. Payouts and decisions are sent by the
 * server agent wallet, not the browser, so they aren't called from here.
 */
export const surveyEscrowAbi = [
  {
    type: "function",
    name: "createSurvey",
    stateMutability: "nonpayable",
    inputs: [
      { name: "surveyHash", type: "bytes32" },
      { name: "rate", type: "uint256" },
      { name: "quota", type: "uint256" },
      { name: "deadline", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "closeSurvey",
    stateMutability: "nonpayable",
    inputs: [{ name: "surveyHash", type: "bytes32" }],
    outputs: [],
  },
] as const;
