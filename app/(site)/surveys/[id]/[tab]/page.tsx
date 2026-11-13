import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SurveyWorkspace } from "@/components/results/survey-workspace";
import { isTabId } from "@/lib/ui/results";

export const metadata: Metadata = { title: "Survey results" };

async function Workspace({ params }: Pick<PageProps<"/surveys/[id]/[tab]">, "params">) {
  const { id, tab } = await params;
  const surveyId = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(surveyId) || !isTabId(tab)) notFound();
  return <SurveyWorkspace surveyId={surveyId} tab={tab} />;
}

export default function Page({ params }: PageProps<"/surveys/[id]/[tab]">) {
  return (
    <Suspense fallback={<p className="px-5 py-14 text-center text-muted">Loading…</p>}>
      <Workspace params={params} />
    </Suspense>
  );
}
