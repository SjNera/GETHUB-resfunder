import { redirect } from "next/navigation";
import { Suspense } from "react";

async function Go({ params }: Pick<PageProps<"/surveys/[id]">, "params">): Promise<never> {
  const { id } = await params;
  return redirect(`/surveys/${encodeURIComponent(id)}/overview`);
}

export default function Page({ params }: PageProps<"/surveys/[id]">) {
  return (
    <Suspense fallback={null}>
      <Go params={params} />
    </Suspense>
  );
}
