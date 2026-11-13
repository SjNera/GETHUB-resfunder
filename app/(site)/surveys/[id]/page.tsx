import { redirect } from "next/navigation";

export default async function Page({ params }: PageProps<"/surveys/[id]">) {
  const { id } = await params;
  redirect(`/surveys/${encodeURIComponent(id)}/overview`);
}
