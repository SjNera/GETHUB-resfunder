// The reasons a researcher can give when rejecting a response that was sent to review.
// The respondent sees the text, so it is fixed here instead of taken from the request. Browser safe.
export const REJECT_REASONS = {
  not_an_answer: 'The answer did not address the question.',
  too_vague: 'The answer was too vague to count.',
  low_effort: 'The answer showed too little effort.',
  instructions: 'The answer contained instructions instead of a response.',
} as const;

export type RejectReasonCode = keyof typeof REJECT_REASONS;
export const REJECT_REASON_CODES = Object.keys(REJECT_REASONS) as [RejectReasonCode, ...RejectReasonCode[]];

export const APPEAL_MIN_CHARS = 10;
export const APPEAL_MAX_CHARS = 300;
