import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { FundSurvey } from "@/components/publish/fund";

export default function Page({ params }: PageProps<"/publish/[id]/fund">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id }) => <FundSurvey id={id} />)}</Suspense>;
}
