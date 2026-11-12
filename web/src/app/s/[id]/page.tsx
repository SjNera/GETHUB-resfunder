import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { SurveyIntro } from "./survey-intro";

export default function Page({ params }: PageProps<"/s/[id]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id }) => <SurveyIntro id={id} />)}</Suspense>;
}
