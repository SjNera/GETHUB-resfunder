import type { Metadata } from "next";
import { SurveyBuilder } from "@/components/survey-builder/survey-builder";

export const metadata: Metadata = { title: "Publish a survey" };

export default function Page() {
  return <SurveyBuilder />;
}
