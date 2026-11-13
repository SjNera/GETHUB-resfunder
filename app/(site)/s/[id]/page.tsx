import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

// A share link. The dashboard at / signs the respondent in, then opens the survey.
async function Go({ params }: Pick<PageProps<"/s/[id]">, "params">): Promise<never> {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) notFound();
  return redirect(`/?s=${id}`);
}

export default function Page({ params }: PageProps<"/s/[id]">) {
  return (
    <Suspense fallback={null}>
      <Go params={params} />
    </Suspense>
  );
}
