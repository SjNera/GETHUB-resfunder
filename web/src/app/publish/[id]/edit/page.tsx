import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { SurveyBuilder } from "@/components/publish/builder";

export default function Page({ params }: PageProps<"/publish/[id]/edit">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id }) => <SurveyBuilder id={id} />)}</Suspense>;
}
