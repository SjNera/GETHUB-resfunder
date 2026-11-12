import { Suspense } from "react";
import { ReviewQueue } from "@/components/publish/review-queue";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function Page({ params }: PageProps<"/publish/[id]/review">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id }) => <ReviewQueue id={id} />)}</Suspense>;
}
