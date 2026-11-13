import type { Metadata } from "next";
import { AccountPanel } from "@/components/auth/account-panel";

export const metadata: Metadata = { title: "Your account" };

export default function Page() {
  return <AccountPanel />;
}
