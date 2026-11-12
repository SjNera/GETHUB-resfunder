import { Suspense } from "react";
import { ResultView } from "@/components/answer/result";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function Page({ params }: PageProps<"/answer/[id]/r/[rid]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id, rid }) => <ResultView surveyId={id} responseId={rid} />)}</Suspense>;
}
