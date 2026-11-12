import { Suspense } from "react";
import { SurveyIntro } from "@/components/answer/intro";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function Page({ params }: PageProps<"/answer/[id]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id }) => <SurveyIntro id={id} />)}</Suspense>;
}
