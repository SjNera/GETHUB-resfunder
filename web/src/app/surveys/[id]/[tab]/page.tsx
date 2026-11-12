import { notFound } from "next/navigation";
import { SurveyShell, TabPlaceholder } from "@/components/review/survey-shell";
import { TABS, type TabId } from "@/lib/review/tabs";
import { SURVEYS } from "@/lib/review/seed";

const OTHER_TABS = TABS.filter(([id]) => id !== "queue");

export function generateStaticParams() {
  return Object.keys(SURVEYS).flatMap((id) => OTHER_TABS.map(([tab]) => ({ id, tab })));
}

export default async function SurveyTabPage({ params }: { params: Promise<{ id: string; tab: string }> }) {
  const { id, tab } = await params;
  const survey = SURVEYS[id];
  const entry = OTHER_TABS.find(([t]) => t === tab);
  if (!survey || !entry) notFound();
  return (
    <SurveyShell survey={survey} tab={entry[0] as TabId}>
      <TabPlaceholder label={entry[1]} />
    </SurveyShell>
  );
}
