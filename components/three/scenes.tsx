"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { CssOrb } from "./fallbacks";
import { useRenderPolicy } from "./use-render-policy";

// three.js loads in its own chunk, only when the orb is rendered.
const OrbCanvas = dynamic(() => import("./orb-canvas"), { ssr: false });

/** CSS fallback shows first (and stays without WebGL); the canvas fades in once ready. */
function Stage({ className, fallback, children }: { className?: string; fallback: ReactNode; children: (p: ReturnType<typeof useRenderPolicy> & { onReady: () => void }) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const policy = useRenderPolicy(ref);
  const [ready, setReady] = useState(false);
  return (
    <div ref={ref} className={cn("relative", className)}>
      <div aria-hidden className={cn("absolute inset-0 transition-opacity duration-500", ready ? "opacity-0" : "opacity-100")}>
        {fallback}
      </div>
      {policy.webgl ? (
        <div className={cn("absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none", ready ? "opacity-100" : "opacity-0")}>
          {children({ ...policy, onReady: () => setReady(true) })}
        </div>
      ) : null}
    </div>
  );
}

export function OrbScene({ className }: { className?: string }) {
  return (
    <Stage className={className} fallback={<CssOrb />}>
      {(p) => <OrbCanvas {...p} />}
    </Stage>
  );
}
