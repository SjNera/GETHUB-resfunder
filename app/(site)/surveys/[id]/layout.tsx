import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { SurveyWorkspace } from "@/components/results/survey-workspace";

async function Workspace({ params }: Pick<LayoutProps<"/surveys/[id]">, "params">) {
  const { id } = await params;
  const surveyId = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(surveyId)) notFound();
  return <SurveyWorkspace surveyId={surveyId} />;
}

// The workspace keeps its signed-in state while the tab pages below it change.
export default function Layout({ params }: LayoutProps<"/surveys/[id]"> & { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="px-5 py-14 text-center text-muted">Loading…</p>}>
      <Workspace params={params} />
    </Suspense>
  );
}
