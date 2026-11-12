"use client";

import type { ReactNode } from "react";
import { useDemo } from "@/lib/data/store";
import { PageSkeleton } from "./ui/skeleton";

/** Demo data lives in localStorage, so render only after it has loaded. */
export function DemoGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const ready = useDemo((s) => s.ready);
  return ready ? <>{children}</> : <>{fallback ?? <PageSkeleton />}</>;
}
