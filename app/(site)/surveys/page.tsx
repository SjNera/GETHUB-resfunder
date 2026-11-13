import { redirect } from "next/navigation";

// The dashboard at / lists the researcher's surveys now.
export default function Page() {
  redirect("/#surveys");
}
