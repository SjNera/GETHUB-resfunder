import type { Metadata } from "next";
import { ComingNext } from "@/components/layout/coming-next";

export const metadata: Metadata = { title: "Surveys" };

// Placeholder. Tasks U3 (answer a survey) and U4 (your surveys and results) replace it.
export default function SurveysPage() {
  return (
    <ComingNext
      path="/surveys"
      eyebrow="Surveys"
      title="Answer a survey"
      task="U3 and U4"
      lead="Here you'll open a survey from its share link, answer it, and see the result within seconds: paid with a BscScan receipt, not paid with the reason, or under review. Researchers will see their surveys and decision logs here too."
    />
  );
}
