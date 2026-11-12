import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QueueView } from "@/components/review/queue-view";
import { SurveyShell } from "@/components/review/survey-shell";
import { SURVEYS } from "@/lib/review/seed";

export const metadata: Metadata = { title: "Review queue" };

export function generateStaticParams() {
  return Object.keys(SURVEYS).map((id) => ({ id }));
}

export default async function QueuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const survey = SURVEYS[id];
  if (!survey) notFound();
  return (
    <SurveyShell survey={survey} tab="queue">
      <QueueView survey={survey} />
    </SurveyShell>
  );
}
