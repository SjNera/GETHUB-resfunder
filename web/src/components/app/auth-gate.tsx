"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { DemoGate } from "@/components/demo-gate";
import { useDemo } from "@/lib/data/store";

function Gate({ children }: { children: ReactNode }) {
  const session = useDemo((s) => s.session);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!session) router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }, [pathname, router, session]);
  return session ? <>{children}</> : null;
}

/** Answer and Publish need a signed-in (allowlisted) user. */
export function AuthGate({ children }: { children: ReactNode }) {
  return (
    <DemoGate>
      <Gate>{children}</Gate>
    </DemoGate>
  );
}
