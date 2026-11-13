import { redirect } from "next/navigation";

// The dashboard at / opens a survey by its link now.
export default function Page() {
  redirect("/?go=answer");
}
