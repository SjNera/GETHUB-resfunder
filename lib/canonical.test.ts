import { describe, expect, it } from 'vitest';
import { keccak256, toBytes } from 'viem';
import { canonicalJson, reasonHash, surveyHash } from './canonical';
import type { SurveyJson } from './types';

describe('canonicalJson', () => {
  it('sorts keys recursively with no whitespace', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, 1], c: 'x' } })).toBe('{"a":{"c":"x","d":[3,1]},"b":1}');
  });
  it('keeps array order', () => {
    expect(canonicalJson(['b', 'a'])).toBe('["b","a"]');
  });
  it('escapes strings like JSON', () => {
    expect(canonicalJson({ t: 'say "hi"\n₱' })).toBe('{"t":"say \\"hi\\"\\n₱"}');
  });
});

describe('surveyHash', () => {
  const a: SurveyJson = {
    title: 'T',
    description: '',
    questions: [{ id: 'q1', type: 'open_ended', text: 'Why?', required: true, allowShort: false }],
  };
  // Same survey, different key order.
  const b = JSON.parse(
    '{"questions":[{"allowShort":false,"required":true,"text":"Why?","type":"open_ended","id":"q1"}],"description":"","title":"T"}',
  ) as SurveyJson;

  it('ignores key order', () => {
    expect(surveyHash(a)).toBe(surveyHash(b));
  });
  it('is keccak256 of the canonical UTF-8 bytes', () => {
    expect(surveyHash(a)).toBe(keccak256(toBytes(canonicalJson(a))));
    expect(surveyHash(a)).toMatch(/^0x[0-9a-f]{64}$/);
  });
  it('changes when content changes', () => {
    expect(surveyHash({ ...a, title: 'U' })).not.toBe(surveyHash(a));
  });
});

describe('reasonHash', () => {
  it('depends on order', () => {
    expect(reasonHash(['a', 'b'])).not.toBe(reasonHash(['b', 'a']));
  });
});
