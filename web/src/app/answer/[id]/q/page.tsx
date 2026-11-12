import { Suspense } from "react";
import { PagedForm } from "@/components/answer/paged-form";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function Page({ params }: PageProps<"/answer/[id]/q">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id }) => <PagedForm id={id} />)}</Suspense>;
}
