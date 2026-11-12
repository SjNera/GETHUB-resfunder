import { isAddress } from "viem";

const escrow = process.env.NEXT_PUBLIC_ESCROW_ADDRESS ?? "";
const token = process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? "";

export const ESCROW_ADDRESS = isAddress(escrow) ? escrow : null;
export const TOKEN_ADDRESS = isAddress(token) ? token : null;

/**
 * Demo mode: until the contract team deploys from Remix and sets both
 * addresses, every transaction is simulated and labelled "simulated".
 */
export const DEMO_MODE = !ESCROW_ADDRESS || !TOKEN_ADDRESS;

export const TOKEN_SYMBOL = "tPHP";
export const TOKEN_LABEL = "tPHP (test token, no real value)";
