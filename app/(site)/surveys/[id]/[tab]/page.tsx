import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isTabId } from "@/lib/ui/results";

export const metadata: Metadata = { title: "Survey results" };

// The content is rendered by the layout's workspace. This page only rejects unknown tabs.
async function Check({ params }: Pick<PageProps<"/surveys/[id]/[tab]">, "params">) {
  const { tab } = await params;
  if (!isTabId(tab)) notFound();
  return null;
}

export default function Page({ params }: PageProps<"/surveys/[id]/[tab]">) {
  return (
    <Suspense fallback={null}>
      <Check params={params} />
    </Suspense>
  );
}
