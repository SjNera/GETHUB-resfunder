// STUB (task S5). Lane A replaces the bodies in task A5. Signatures must not change.
// Server only. Never import from a client component.
import type { Hex } from '../types';

export async function sendDecision(_args: {
  surveyId: number;
  respondent: string;
  decision: 'pay' | 'dont_pay';
  reasonHash: Hex;
}): Promise<Hex> {
  // Fake 32-byte tx hash.
  return `0x${'ab'.repeat(32)}`;
}

export type ReceiptStatus =
  | { state: 'pending' }
  | { state: 'success' }
  | { state: 'reverted'; error: string };

export async function getReceiptStatus(_txHash: Hex): Promise<ReceiptStatus> {
  return { state: 'success' };
}

/** Polls until success, reverted, or timeout. On timeout returns { state: 'pending' }. */
export async function waitForReceipt(_txHash: Hex, _timeoutMs: number): Promise<ReceiptStatus> {
  return { state: 'success' };
}

export interface SurveyCreatedEvent {
  surveyId: number;
  researcher: string; // lowercase
  surveyHash: Hex;
  rate: bigint;
  quota: number;
  deadline: number;
  feePerResponse: bigint;
}

/** Null unless the tx succeeded, was sent to ESCROW_ADDRESS, and contains the event. */
export async function readSurveyCreated(_txHash: Hex): Promise<SurveyCreatedEvent | null> {
  return null;
}

export interface ClosedEvent {
  surveyId: number;
  researcher: string;
  refunded: bigint;
}

export async function readClosed(_txHash: Hex): Promise<ClosedEvent | null> {
  return null;
}
