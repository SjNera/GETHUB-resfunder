import { redirect } from "next/navigation";

// The dashboard at / builds and funds surveys now.
export default function Page() {
  redirect("/?go=publish");
}
