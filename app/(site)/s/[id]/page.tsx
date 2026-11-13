import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RespondentPage } from "@/components/respond/respondent-page";

export const metadata: Metadata = { title: "Answer a survey" };

async function Survey({ params }: Pick<PageProps<"/s/[id]">, "params">) {
  const { id } = await params;
  const surveyId = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(surveyId)) notFound();
  return <RespondentPage surveyId={surveyId} />;
}

export default function Page({ params }: PageProps<"/s/[id]">) {
  return (
    <Suspense fallback={<p className="px-5 py-14 text-center text-muted">Loading survey…</p>}>
      <Survey params={params} />
    </Suspense>
  );
}
