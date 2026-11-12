"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatDuration } from "@/lib/format";

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** "5h 12m left · Nov 13, 4:20 PM" */
export function Countdown({ to, suffix = "left", showAbsolute = true }: { to: string; suffix?: string; showAbsolute?: boolean }) {
  const now = useNow();
  const ms = new Date(to).getTime() - now;
  return (
    <span className="nums">
      {ms > 0 ? `${formatDuration(ms)} ${suffix}` : "Time's up"}
      {showAbsolute ? <span className="text-muted"> · {formatDateTime(to)}</span> : null}
    </span>
  );
}
