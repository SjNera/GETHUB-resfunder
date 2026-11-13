import { redirect } from "next/navigation";
import { Suspense } from "react";

// Sign-in lives in the dashboard at / now. `next` from the old links is mapped to where the dashboard should open.
async function Go({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">): Promise<never> {
  const next = (await searchParams).next;
  const to = typeof next === "string" ? next : "";
  const survey = /^\/s\/(\d{1,12})$/.exec(to);
  if (survey) return redirect(`/?s=${survey[1]}`);
  if (to === "/publish") return redirect("/?go=publish");
  if (to === "/join") return redirect("/?go=answer");
  return redirect("/?signin=1");
}

export default function Page({ searchParams }: PageProps<"/sign-in">) {
  return (
    <Suspense fallback={null}>
      <Go searchParams={searchParams} />
    </Suspense>
  );
}
