import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DecisionLog } from "@/components/publish/decision-log";

export default function Page({ params }: PageProps<"/publish/[id]/log">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id }) => <DecisionLog id={id} />)}</Suspense>;
}
