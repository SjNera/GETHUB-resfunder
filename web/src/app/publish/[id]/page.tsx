import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { PublishOverview } from "@/components/publish/overview";

export default function Page({ params }: PageProps<"/publish/[id]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id }) => <PublishOverview id={id} />)}</Suspense>;
}
