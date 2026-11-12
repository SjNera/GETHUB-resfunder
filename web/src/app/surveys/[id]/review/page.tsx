import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { ReviewQueue } from "@/components/researcher/review-queue";

export default function Page({ params }: PageProps<"/surveys/[id]/review">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id }) => <ReviewQueue id={id} />)}</Suspense>;
}
