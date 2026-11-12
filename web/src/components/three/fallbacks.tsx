import { Check, Clock3, X } from "lucide-react";
import type { CoinKind } from "./coin";

/** CSS 3D versions from the mobile canvas: poster while loading, and the no-WebGL fallback. */
export function CssHero() {
  return (
    <div className="absolute inset-0 grid place-items-center [perspective:1100px]">
      <div className="relative h-[78%] max-h-[420px] w-auto [aspect-ratio:1/2]">
        <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#2a2a2a] to-[#0b0b0b] p-[4%] shadow-[-30px_40px_60px_-20px_rgba(70,25,0,0.55)] [transform:rotateY(-22deg)_rotateX(10deg)_rotateZ(8deg)]">
          <div className="flex h-full flex-col rounded-[2rem] bg-gradient-to-b from-[#fafaf8] via-[#f6efe6] to-[#ffe7cf] p-[9%] pt-[16%] text-[#121212]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#5f5f5c]">Screened in 4 s</p>
            <p className="mt-2 text-[26px] font-extrabold leading-[0.98] tracking-[-0.04em]">₱10 sent.</p>
            <div className="mt-auto h-8 rounded-full bg-[#121212]" />
          </div>
        </div>
      </div>
      <div className="absolute right-[12%] top-[12%] size-20 rotate-[-18deg] rounded-full bg-[radial-gradient(circle_at_32%_28%,#ffd29c_0%,#ff8a1c_45%,#b35a00_100%)] shadow-[6px_9px_0_#8a4500,10px_20px_26px_-6px_rgba(70,25,0,0.45)]" />
      <div className="absolute bottom-[22%] right-[14%] grid size-16 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_26%,#8fe0a9_0%,#2f9a54_55%,#155c2b_100%)] shadow-[5px_8px_0_#0f4520]">
        <Check className="size-7 text-[#f2f1ee]" strokeWidth={3} />
      </div>
      <div className="absolute left-[12%] top-[10%] size-12 rounded-full border-[11px] border-[#121212] [transform:rotateX(55deg)_rotate(20deg)]" />
    </div>
  );
}

export function CssOrb() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="aspect-square w-[70%] max-w-[34rem] rounded-full opacity-90 blur-2xl [background:radial-gradient(circle_at_30%_30%,#ffd29c_0%,#ff8a1c_22%,rgba(255,138,28,0.35)_42%,transparent_62%),radial-gradient(circle_at_72%_68%,rgba(120,140,255,0.35)_0%,transparent_40%)]" />
    </div>
  );
}

const COIN: Record<CoinKind, { bg: string; edge: string; icon: React.ReactNode }> = {
  check: { bg: "radial-gradient(circle at 32% 26%, #8fe0a9 0%, #2f9a54 55%, #155c2b 100%)", edge: "#0f4520", icon: <Check className="size-1/2 text-[#f2f1ee]" strokeWidth={2.6} /> },
  clock: { bg: "radial-gradient(circle at 32% 26%, #ffffff 0%, #f2f1ee 45%, #c9c6bf 100%)", edge: "#a8a49b", icon: <Clock3 className="size-1/2 text-[#121212]" strokeWidth={2.2} /> },
  cross: { bg: "radial-gradient(circle at 32% 26%, #ff9b8f 0%, #d0402f 55%, #8e1f14 100%)", edge: "#6e160e", icon: <X className="size-1/2 text-[#f2f1ee]" strokeWidth={2.6} /> },
  diamond: { bg: "radial-gradient(circle at 32% 26%, #ffd29c 0%, #ff8a1c 55%, #b35a00 100%)", edge: "#8a4500", icon: null },
};

export function CssCoin({ kind }: { kind: CoinKind }) {
  const c = COIN[kind];
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="grid aspect-square w-[44%] max-w-52 place-items-center rounded-full [transform:rotateX(18deg)_rotate(-12deg)]" style={{ background: c.bg, boxShadow: `0 14px 0 ${c.edge}, 0 30px 40px -10px rgba(18,18,18,0.45)` }}>
        {c.icon}
      </div>
    </div>
  );
}
