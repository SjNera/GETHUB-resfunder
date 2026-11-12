import { expect, it } from 'vitest';
import { buildAuthMessage } from './message';

it('builds the pipe-separated message with a lowercase wallet', () => {
  expect(buildAuthMessage('submit', 7, '0xAbCdEf0000000000000000000000000000000001', 1700000000000)).toBe(
    'ResFunder|submit|7|0xabcdef0000000000000000000000000000000001|1700000000000',
  );
});

it('uses surveyId 0 for list_surveys', () => {
  expect(buildAuthMessage('list_surveys', 0, '0xA', 1)).toBe('ResFunder|list_surveys|0|0xa|1');
});
