import type { Metadata } from "next";
import { Suspense } from "react";
import { WalletSignIn } from "@/components/auth/wallet-sign-in";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WalletSignIn />
    </Suspense>
  );
}
