export const TABS = [
  ["overview", "Overview"],
  ["queue", "Review queue"],
  ["log", "Decision log"],
  ["results", "Results"],
  ["questions", "Questions"],
  ["settings", "Settings"],
] as const;

export type TabId = (typeof TABS)[number][0];
