import { isAddress } from "viem";

const escrow = process.env.NEXT_PUBLIC_ESCROW_ADDRESS ?? "";
const token = process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? "";

export const ESCROW_ADDRESS = isAddress(escrow) ? escrow : null;
/** The mock peso token (tPHP): a clearly labelled test ERC-20, no real value. */
export const TOKEN_ADDRESS = isAddress(token) ? token : null;

/**
 * Demo mode: until both contracts are deployed from Remix and their
 * addresses are set, every transaction is simulated and labelled "simulated".
 */
export const DEMO_MODE = !ESCROW_ADDRESS || !TOKEN_ADDRESS;

export const TOKEN_SYMBOL = "tPHP";
export const TOKEN_LABEL = "tPHP (mock peso token, no real value)";
