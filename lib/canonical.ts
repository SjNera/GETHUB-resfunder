// FROZEN. Changes need all three devs to agree. Source: docs/TDD.md section 5.1.
// Browser and server safe: viem only, no Node APIs.
import { keccak256, toBytes } from 'viem';
import type { Hex, SurveyJson } from './types';

/** Sorts object keys recursively, no whitespace. Arrays keep their order. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => (v === undefined ? 'null' : canonicalJson(v))).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') + '}';
}

/** keccak256 of the UTF-8 bytes of canonicalJson(survey). */
export function surveyHash(survey: SurveyJson): Hex {
  return keccak256(toBytes(canonicalJson(survey)));
}

/** keccak256 of the UTF-8 bytes of canonicalJson(reasons). */
export function reasonHash(reasons: string[]): Hex {
  return keccak256(toBytes(canonicalJson(reasons)));
}
