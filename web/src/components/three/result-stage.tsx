import type { ReactNode } from "react";
import type { Outcome } from "@/lib/types";
import { CoinScene } from "./scenes";

const STAGE: Record<Outcome, string> = {
  pay: "radial-gradient(110% 80% at 30% 0%, #FFE2BF 0%, #FFB066 45%, #FF8A1C 100%)",
  review: "radial-gradient(110% 80% at 30% 0%, #FFF6D6 0%, #F7DE7A 50%, #E9B92E 100%)",
  dont_pay: "radial-gradient(110% 80% at 30% 0%, #F4F2EE 0%, #DAD6CE 55%, #B9B3A8 100%)",
};
const KIND = { pay: "check", review: "clock", dont_pay: "cross" } as const;

/** Coloured stage with the 3D coin for the outcome (choreograph: one entrance, the coin leads). */
export function ResultStage({ outcome, children }: { outcome: Outcome; children?: ReactNode }) {
  return (
    <div className="relative h-[19rem] overflow-hidden rounded-[2.25rem] sm:h-[22rem]" style={{ background: STAGE[outcome] }}>
      <CoinScene kind={KIND[outcome]} className="materialize absolute inset-0" />
      {children}
    </div>
  );
}
