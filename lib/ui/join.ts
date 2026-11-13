// Turns what a respondent pastes (a share link, "/s/7" or just "7") into a survey path.
export function parseSurveyRef(input: string): string | null {
  const t = input.trim();
  const m = /^(?:https?:\/\/[^/\s]+)?\/?(?:s\/)?(\d{1,12})\/?(?:[?#].*)?$/i.exec(t);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isSafeInteger(id) ? `/s/${id}` : null;
}
