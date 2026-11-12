"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { CoinKind } from "./coin";
import { CssCoin, CssHero, CssOrb } from "./fallbacks";
import { useRenderPolicy } from "./use-render-policy";

// three.js only loads on routes that render one of these, never in other bundles.
const HeroCanvas = dynamic(() => import("./hero-canvas"), { ssr: false });
const OrbCanvas = dynamic(() => import("./orb-canvas"), { ssr: false });
const CoinCanvas = dynamic(() => import("./coin-canvas"), { ssr: false });

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

export function HeroScene({ className }: { className?: string }) {
  return (
    <Stage className={className} fallback={<CssHero />}>
      {(p) => <HeroCanvas {...p} />}
    </Stage>
  );
}

export function OrbScene({ className }: { className?: string }) {
  return (
    <Stage className={className} fallback={<CssOrb />}>
      {(p) => <OrbCanvas {...p} />}
    </Stage>
  );
}

export function CoinScene({ kind, className }: { kind: CoinKind; className?: string }) {
  return (
    <Stage className={className} fallback={<CssCoin kind={kind} />}>
      {(p) => <CoinCanvas {...p} kind={kind} />}
    </Stage>
  );
}
