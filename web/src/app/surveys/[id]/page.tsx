import { redirect } from "next/navigation";
import { SURVEYS } from "@/lib/review/seed";

export function generateStaticParams() {
  return Object.keys(SURVEYS).map((id) => ({ id }));
}

export default async function SurveyIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/surveys/${id}/queue`);
}
