import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RespondentPage } from "@/components/respond/respondent-page";

export const metadata: Metadata = { title: "Answer a survey" };

export default async function Page({ params }: PageProps<"/s/[id]">) {
  const { id } = await params;
  const surveyId = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(surveyId)) notFound();
  return <RespondentPage surveyId={surveyId} />;
}
