import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { AnswerForm } from "./answer-form";

export default function Page({ params }: PageProps<"/s/[id]/answer">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ id }) => <AnswerForm id={id} />)}</Suspense>;
}
