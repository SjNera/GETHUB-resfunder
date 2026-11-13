import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

// The dashboard at / shows a survey's workspace now.
async function Go({ params }: Pick<PageProps<"/surveys/[id]">, "params">): Promise<never> {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) notFound();
  return redirect(`/#survey-${id}-overview`);
}

export default function Page({ params }: PageProps<"/surveys/[id]">) {
  return (
    <Suspense fallback={null}>
      <Go params={params} />
    </Suspense>
  );
}
