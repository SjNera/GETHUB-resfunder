// FROZEN. Changes need all three devs to agree. Source: docs/TDD.md section 5.3.
// Browser safe. surveyId is 0 for list_surveys.
import type { AuthAction } from '../types';

export function buildAuthMessage(action: AuthAction, surveyId: number, wallet: string, timestamp: number): string {
  return `ResFunder|${action}|${surveyId}|${wallet.toLowerCase()}|${timestamp}`;
}
