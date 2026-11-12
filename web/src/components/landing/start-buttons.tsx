"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ArrowLeft, Coins, FileCheck2, Inbox, Lock, MailCheck, Receipt, ScrollText, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useDemo } from "@/lib/data/store";

type Path = "publish" | "answer";

type Page = { icon: ReactNode; title: string; body: string; fact: string };

/** Three short pages per path: one idea each, concrete numbers from the proposal. */
const PAGES: Record<Path, { label: string; done: string; target: string; pages: Page[] }> = {
  publish: {
    label: "Publish a survey",
    done: "Fund the survey",
    target: "/publish",
    pages: [
      {
        icon: <Lock />,
        title: "Lock your budget once",
        body: "Set the pay per answer and how many you need. The total plus a 5% fee goes into an escrow contract on BNB Smart Chain.",
        fact: "₱10 × 150 answers + ₱75 fee = ₱1,575",
      },
      {
        icon: <FileCheck2 />,
        title: "Only honest answers get paid",
        body: "Code checks and two AI labels screen every response. Plain rules decide. Unclear cases come to you, and pay the student if you don't decide in 24 hours.",
        fact: "Empty, copied or keyboard-mash answers are never paid",
      },
      {
        icon: <ScrollText />,
        title: "Close and get the rest back",
        body: "Close any time. Everything unspent returns to your wallet, and your adviser can read every decision in the log.",
        fact: "The 5% fee is the only part you don't get back",
      },
    ],
  },
  answer: {
    label: "Answer a survey",
    done: "See open surveys",
    target: "/answer",
    pages: [
      {
        icon: <MailCheck />,
        title: "Sign in with your school email",
        body: "Only a hash of it is stored on-chain. Each student can answer a survey once.",
        fact: "Demo: pick an email from the allowlist",
      },
      {
        icon: <Inbox />,
        title: "Answer honestly",
        body: "A sentence or two is enough. Short answers, Filipino and Taglish are all fine. An AI only checks for non-answers like “ok”.",
        fact: "About 4 minutes per survey",
      },
      {
        icon: <Receipt />,
        title: "Get paid in seconds",
        body: "If your answers pass, the agent wallet sends the fixed rate right away, with a public receipt. If a person needs to check, you're paid within 24 hours unless they decline, and you can appeal once.",
        fact: "₱10 per honest answer, in mock pesos (tPHP)",
      },
    ],
  },
};

const seenKey = (p: Path) => `onboard-${p}`;

/**
 * The landing page's two actions. A first-time visitor gets a short intro
 * sheet for the path they picked; anyone who has seen it goes straight in.
 */
export function StartButtons({ className, size = "lg" }: { className?: string; size?: "md" | "lg" }) {
  const router = useRouter();
  const ready = useDemo((s) => s.ready);
  const session = useDemo((s) => s.session);
  const seen = useDemo((s) => s.seenTips);
  const dismissTip = useDemo((s) => s.dismissTip);
  const [open, setOpen] = useState<Path | null>(null);

  const go = (path: Path) => {
    const target = PAGES[path].target;
    router.push(session ? target : `/sign-in?next=${encodeURIComponent(target)}`);
  };

  const start = (path: Path) => {
    if (ready && seen[seenKey(path)]) go(path);
    else setOpen(path);
  };

  const finish = (path: Path) => {
    dismissTip(seenKey(path));
    setOpen(null);
    go(path);
  };

  return (
    <>
      <div className={cn("flex flex-wrap items-center justify-center gap-3", className)}>
        <Button variant="primary" size={size} onClick={() => start("publish")}>
          Publish a survey
        </Button>
        <Button variant="outline" size={size} onClick={() => start("answer")}>
          Answer a survey
        </Button>
      </div>
      <Dialog.Root open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        {open ? <Sheet key={open} path={open} onFinish={() => finish(open)} onSkip={() => finish(open)} /> : null}
      </Dialog.Root>
    </>
  );
}

function Sheet({ path, onFinish, onSkip }: { path: Path; onFinish: () => void; onSkip: () => void }) {
  const flow = PAGES[path];
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<"in" | "back">("in");
  const page = flow.pages[i];
  const last = i === flow.pages.length - 1;
  const move = (n: number) => {
    setDir(n > i ? "in" : "back");
    setI(n);
  };

  return (
    <Dialog.Portal>
      {/* Modal task: dim the page behind it */}
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/35 transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:bg-black/60" />
      <Dialog.Popup
        className={cn(
          "fixed z-50 flex flex-col bg-surface text-fg shadow-2xl outline-none",
          // phone: a bottom sheet; desktop: a centred card
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[2rem] pb-[max(1rem,env(safe-area-inset-bottom))]",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(92vw,30rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem] sm:pb-0",
          "transition-[transform,opacity] duration-300 ease-[var(--ease-drawer)] data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full data-[ending-style]:duration-200",
          "sm:duration-200 sm:ease-[var(--ease-out)] sm:data-[starting-style]:translate-y-[-50%] sm:data-[starting-style]:scale-95 sm:data-[starting-style]:opacity-0 sm:data-[ending-style]:translate-y-[-50%] sm:data-[ending-style]:scale-95 sm:data-[ending-style]:opacity-0",
          "motion-reduce:transition-opacity motion-reduce:data-[starting-style]:translate-y-0 motion-reduce:data-[ending-style]:translate-y-0",
        )}
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border-strong sm:hidden" />
        <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6 sm:pt-6">
          <p className="eyebrow">
            {flow.label} · {i + 1} of {flow.pages.length}
          </p>
          <Dialog.Close aria-label="Close" className="pressable grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg">
            <X className="size-5" />
          </Dialog.Close>
        </div>

        <div key={i} className={cn("px-5 pt-4 sm:px-6", dir === "in" ? "page-in" : "page-back")}>
          <div className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-ink [&_svg]:size-6">{page.icon}</div>
          <Dialog.Title className="display mt-5 text-[2rem] [line-height:1.05]">{page.title}</Dialog.Title>
          <Dialog.Description className="mt-3 text-[16px] leading-relaxed text-muted">{page.body}</Dialog.Description>
          <p className="mt-5 flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-[15px] font-medium">
            <Coins className="size-4 shrink-0 text-brand-ink" aria-hidden />
            <span className="nums">{page.fact}</span>
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 px-5 pb-1 sm:px-6 sm:pb-6">
          <div className="flex items-center gap-1.5" aria-hidden>
            {flow.pages.map((_, n) => (
              <span key={n} className={cn("h-1.5 rounded-full transition-[width,background-color] duration-200", n === i ? "w-5 bg-fg" : "w-1.5 bg-border-strong")} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {i > 0 ? (
              <Button variant="ghost" size="icon" aria-label="Previous" onClick={() => move(i - 1)}>
                <ArrowLeft />
              </Button>
            ) : (
              <Button variant="ghost" onClick={onSkip}>
                Skip intro
              </Button>
            )}
            {last ? (
              <Button variant="primary" onClick={onFinish} autoFocus>
                {flow.done}
              </Button>
            ) : (
              <Button variant="dark" onClick={() => move(i + 1)}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  );
}
