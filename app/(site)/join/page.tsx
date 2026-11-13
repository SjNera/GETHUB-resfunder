import type { Metadata } from "next";
import { JoinForm } from "@/components/respond/join-form";

export const metadata: Metadata = { title: "Answer a survey" };

export default function Page() {
  return <JoinForm />;
}
