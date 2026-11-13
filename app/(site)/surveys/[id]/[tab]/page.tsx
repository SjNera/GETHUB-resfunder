import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SurveyWorkspace } from "@/components/results/survey-workspace";
import { isTabId } from "@/lib/ui/results";

export const metadata: Metadata = { title: "Survey results" };

export default async function Page({ params }: PageProps<"/surveys/[id]/[tab]">) {
  const { id, tab } = await params;
  const surveyId = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(surveyId) || !isTabId(tab)) notFound();
  return <SurveyWorkspace surveyId={surveyId} tab={tab} />;
}
