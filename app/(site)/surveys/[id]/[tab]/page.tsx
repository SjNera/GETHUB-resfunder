import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

const TABS = new Set(["overview", "queue", "log", "results", "questions", "settings"]);

// The dashboard at / shows a survey's workspace now.
async function Go({ params }: Pick<PageProps<"/surveys/[id]/[tab]">, "params">): Promise<never> {
  const { id, tab } = await params;
  if (!/^\d{1,12}$/.test(id) || !TABS.has(tab)) notFound();
  return redirect(`/#survey-${id}-${tab}`);
}

export default function Page({ params }: PageProps<"/surveys/[id]/[tab]">) {
  return (
    <Suspense fallback={null}>
      <Go params={params} />
    </Suspense>
  );
}
