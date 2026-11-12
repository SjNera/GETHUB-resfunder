import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { SurveyOverview } from "@/components/researcher/overview";

export default function Page({ params }: PageProps<"/surveys/[id]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id }) => <SurveyOverview id={id} />)}</Suspense>;
}
