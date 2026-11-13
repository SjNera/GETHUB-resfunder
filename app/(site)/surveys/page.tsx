import type { Metadata } from "next";
import { SurveyList } from "@/components/results/survey-list";

export const metadata: Metadata = { title: "My surveys" };

export default function Page() {
  return <SurveyList />;
}
