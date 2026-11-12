"use client";

import { BookOpen, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useDemo } from "@/lib/data/store";
import { Logo } from "./logo";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/rubric", label: "Rubric" },
  { href: "/answer", label: "Answer a survey" },
  { href: "/publish", label: "Publish a survey" },
];

function Account({ compact }: { compact?: boolean }) {
  const session = useDemo((s) => s.session);
  const ready = useDemo((s) => s.ready);
  const signOut = useDemo((s) => s.signOut);
  const guideHidden = useDemo((s) => s.guideHidden);
  const setGuideHidden = useDemo((s) => s.setGuideHidden);
  if (!ready) return <span className="h-9 w-20" />;
  if (!session)
    return (
      <ButtonLink href="/sign-in" variant="dark" size="sm">
        Sign in
      </ButtonLink>
    );
  return (
    <div className="flex items-center gap-1">
      {guideHidden ? (
        <Button variant="ghost" size="sm" onClick={() => setGuideHidden(false)} className={compact ? "px-2.5" : ""} aria-label="Show guide">
          <BookOpen />
          {compact ? null : "Guide"}
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" onClick={signOut} title={`Signed in as ${session.email}. Sign out`} aria-label={`Sign out ${session.email}`} className={compact ? "px-2.5" : ""}>
        {compact ? (
          <span className="grid size-7 place-items-center rounded-full bg-inverse text-xs font-semibold uppercase text-inverse-fg">{session.email[0]}</span>
        ) : (
          <span className="max-w-44 truncate">{session.email}</span>
        )}
        <LogOut aria-hidden />
      </Button>
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
        <div className="material mx-auto flex h-16 max-w-6xl items-center gap-3 rounded-full pl-5 pr-2.5">
          <Logo />
          <nav aria-label="Site" className="mx-auto hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="on-glass rounded-full px-3 py-2 text-[15px] !font-normal text-muted hover:text-fg">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden md:block md:ml-0">
            <Account />
          </div>
          <div className="ml-auto flex items-center gap-1 md:hidden">
            <Account compact />
            <Button variant="ghost" size="icon" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {open ? (
          <nav id="mobile-nav" aria-label="Site" className="material pop mx-auto mt-2 flex max-w-6xl flex-col rounded-3xl p-2 md:hidden">
            {[{ href: "/", label: "Home" }, ...links].map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="on-glass rounded-2xl px-4 py-3 text-base hover:bg-surface-2">
                {l.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
    </>
  );
}
