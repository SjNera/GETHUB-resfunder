import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { ResultView } from "./result-view";

export default function Page({ params }: PageProps<"/s/[id]/r/[responseId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {params.then(({ id, responseId }) => (
        <ResultView surveyId={id} responseId={responseId} />
      ))}
    </Suspense>
  );
}
