// Tabs for the researcher's survey page (task U4).
export const TABS = [
  ["overview", "Overview"],
  ["log", "Decision log"],
  ["questions", "Questions"],
] as const;

export type TabId = (typeof TABS)[number][0];
