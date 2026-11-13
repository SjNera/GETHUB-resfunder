// Lane A. SurveyEscrow calls and event reads. Source: docs/TDD.md section 9.
// Server only: never import from a client component. Signatures are frozen (they match the S5 stubs).
import {
  getAddress,
  isAddress,
  parseEventLogs,
  TransactionReceiptNotFoundError,
  type Address,
  type TransactionReceipt,
} from 'viem';
import type { Hex } from '../types';
import { ESCROW_ABI, ESCROW_ADDRESS } from './abi';
import { getAgentWalletClient, getPublicClient } from './client';

const RECEIPT_POLL_MS = 1_000;

function escrowAddress(): Address {
  if (!ESCROW_ADDRESS || !isAddress(ESCROW_ADDRESS, { strict: false })) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is not set to a valid address');
  }
  return getAddress(ESCROW_ADDRESS);
}

function toSafeNumber(value: bigint, field: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${field} is too large: ${value}`);
  return Number(value);
}

// In-process mutex: sends from one server instance run one at a time, so they never share a nonce.
// viem fetches the pending nonce for each send.
let sendQueue: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = sendQueue.then(task, task);
  sendQueue = run.catch(() => undefined);
  return run;
}

export async function sendDecision(args: {
  surveyId: number;
  respondent: string;
  decision: 'pay' | 'dont_pay';
  reasonHash: Hex;
}): Promise<Hex> {
  const respondent = getAddress(args.respondent);
  const decision = args.decision === 'pay' ? 1 : 0;
  return serialized(async () => {
    const wallet = getAgentWalletClient();
    // writeContract estimates gas first, so a call that would revert throws here, before any hash exists.
    return wallet.writeContract({
      address: escrowAddress(),
      abi: ESCROW_ABI,
      functionName: 'recordDecision',
      args: [BigInt(args.surveyId), respondent, decision, args.reasonHash],
    });
  });
}

export type ReceiptStatus =
  | { state: 'pending' }
  | { state: 'success' }
  | { state: 'reverted'; error: string };

export async function getReceiptStatus(txHash: Hex): Promise<ReceiptStatus> {
  let receipt: TransactionReceipt;
  try {
    receipt = await getPublicClient().getTransactionReceipt({ hash: txHash });
  } catch (err) {
    if (!(err instanceof TransactionReceiptNotFoundError)) {
      // An RPC failure is not a verdict. Leave it pending so a later check settles it.
      console.warn('getReceiptStatus: RPC error, treating as pending:', err instanceof Error ? err.message : err);
    }
    return { state: 'pending' };
  }
  if (receipt.status === 'success') return { state: 'success' };
  return { state: 'reverted', error: `Transaction ${txHash} reverted on-chain (block ${receipt.blockNumber}).` };
}

/** Polls until success, reverted, or timeout. On timeout returns { state: 'pending' }. */
export async function waitForReceipt(txHash: Hex, timeoutMs: number): Promise<ReceiptStatus> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const status = await getReceiptStatus(txHash);
    if (status.state !== 'pending') return status;
    const left = deadline - Date.now();
    if (left <= 0) return { state: 'pending' };
    await new Promise((resolve) => setTimeout(resolve, Math.min(RECEIPT_POLL_MS, left)));
  }
}

/** The receipt of a successful transaction sent to ESCROW_ADDRESS, else null. */
async function escrowReceipt(txHash: Hex): Promise<TransactionReceipt | null> {
  let receipt: TransactionReceipt;
  try {
    receipt = await getPublicClient().getTransactionReceipt({ hash: txHash });
  } catch (err) {
    if (err instanceof TransactionReceiptNotFoundError) return null;
    throw err;
  }
  if (receipt.status !== 'success') return null;
  if (receipt.to?.toLowerCase() !== escrowAddress().toLowerCase()) return null;
  return receipt;
}

/** Logs emitted by ESCROW_ADDRESS only, so a look-alike contract's events are ignored. */
function escrowLogs(receipt: TransactionReceipt) {
  const address = escrowAddress().toLowerCase();
  return receipt.logs.filter((log) => log.address.toLowerCase() === address);
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
export async function readSurveyCreated(txHash: Hex): Promise<SurveyCreatedEvent | null> {
  const receipt = await escrowReceipt(txHash);
  if (!receipt) return null;
  const [event] = parseEventLogs({ abi: ESCROW_ABI, eventName: 'SurveyCreated', logs: escrowLogs(receipt) });
  if (!event) return null;
  const a = event.args;
  return {
    surveyId: toSafeNumber(a.surveyId, 'surveyId'),
    researcher: a.researcher.toLowerCase(),
    surveyHash: a.surveyHash,
    rate: a.rate,
    quota: toSafeNumber(a.quota, 'quota'),
    deadline: toSafeNumber(a.deadline, 'deadline'),
    feePerResponse: a.feePerResponse,
  };
}

export interface ClosedEvent {
  surveyId: number;
  researcher: string;
  refunded: bigint;
}

/** Null unless the tx succeeded, was sent to ESCROW_ADDRESS, and contains the event. researcher is lowercase. */
export async function readClosed(txHash: Hex): Promise<ClosedEvent | null> {
  const receipt = await escrowReceipt(txHash);
  if (!receipt) return null;
  const [event] = parseEventLogs({ abi: ESCROW_ABI, eventName: 'Closed', logs: escrowLogs(receipt) });
  if (!event) return null;
  return {
    surveyId: toSafeNumber(event.args.surveyId, 'surveyId'),
    researcher: event.args.researcher.toLowerCase(),
    refunded: event.args.refunded,
  };
}
