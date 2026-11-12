/**
 * STUB — replace with the real ABI from Remix.
 *
 * After compiling SurveyEscrow.sol in Remix, open the Solidity compiler tab,
 * click "ABI" to copy it, and paste it below keeping `as const` so viem and
 * wagmi infer argument types. The argument order of createSurvey/closeSurvey
 * must match what lib/web3/useFundSurvey.ts sends.
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
    outputs: [{ name: "surveyId", type: "uint256" }],
  },
  {
    type: "function",
    name: "closeSurvey",
    stateMutability: "nonpayable",
    inputs: [{ name: "surveyHash", type: "bytes32" }],
    outputs: [],
  },
] as const;
