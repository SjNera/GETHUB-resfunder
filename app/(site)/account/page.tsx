import { redirect } from "next/navigation";

// The dashboard at / has the account settings now.
export default function Page() {
  redirect("/#settings");
}
