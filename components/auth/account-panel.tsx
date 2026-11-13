"use client";

import { useState } from "react";
import { RequireSession } from "@/components/auth/require-session";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/ui/auth/client";
import { clearProofs } from "@/lib/ui/wallet";

export function AccountPanel() {
  const [busy, setBusy] = useState(false);
  return (
    <RequireSession>
      {(user) => (
        <div className="mx-auto w-full max-w-xl px-5 py-14">
          <h1 className="display text-3xl">Your account</h1>
          <dl className="mt-6 grid gap-3 rounded-2xl border border-border bg-surface p-5 text-[15px]">
            <div className="flex justify-between gap-4"><dt className="text-muted">Email</dt><dd className="break-all">{user.email}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Network</dt><dd>BNB Smart Chain Testnet</dd></div>
          </dl>
          <Button variant="outline" className="mt-6" disabled={busy}
            onClick={async () => { setBusy(true); clearProofs(); await authClient.signOut(); window.location.assign("/"); }}>
            Sign out
          </Button>
        </div>
      )}
    </RequireSession>
  );
}
