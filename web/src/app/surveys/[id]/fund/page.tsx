import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { FundSurvey } from "@/components/researcher/fund";

export default function Page({ params }: PageProps<"/surveys/[id]/fund">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id }) => <FundSurvey id={id} />)}</Suspense>;
}
