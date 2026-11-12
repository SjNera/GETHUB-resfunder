"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { ButtonLink, Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useDemo } from "@/lib/data/store";
import { Logo } from "./logo";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/rubric", label: "Rubric" },
  { href: "/s/sleep-study", label: "Answer a survey" },
  { href: "/dashboard", label: "For researchers" },
];

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main" className="mx-auto hidden items-center gap-1 md:flex">
      {links.map((l) => {
        const active = l.href !== "/#how" && !!pathname && pathname.startsWith(l.href.split("#")[0]) && l.href !== "/";
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-2 text-[15px] text-muted transition-colors duration-150 hover:text-fg",
              active && "text-fg",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const session = useDemo((s) => s.session);
  const signOut = useDemo((s) => s.signOut);
  const ready = useDemo((s) => s.ready);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="material mx-auto flex h-16 max-w-6xl items-center gap-4 rounded-full pl-5 pr-2.5">
        <Logo />
        <Suspense fallback={<NavLinks pathname="" />}>
          <ActiveNavLinks />
        </Suspense>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <div className="hidden items-center gap-2 sm:flex">
          {ready && session ? (
            <Button variant="ghost" size="sm" onClick={signOut} title="Sign out">
              <span className="max-w-40 truncate">{session.email}</span>
              <LogOut aria-hidden />
            </Button>
          ) : (
            <ButtonLink href="/sign-in" variant="outline" size="sm">
              Sign in
            </ButtonLink>
          )}
          <ButtonLink href="/dashboard" variant="dark" size="sm">
            Dashboard
          </ButtonLink>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Main" className="material pop mx-auto mt-2 flex max-w-6xl flex-col rounded-3xl p-2 md:hidden">
          {[...links, session ? null : { href: "/sign-in", label: "Sign in" }].filter(Boolean).map((l) => (
            <Link
              key={l!.href}
              href={l!.href}
              onClick={() => setOpen(false)}
              className="rounded-2xl px-4 py-3 text-base hover:bg-surface-2"
            >
              {l!.label}
            </Link>
          ))}
          {session ? (
            <button type="button" onClick={() => { signOut(); setOpen(false); }} className="rounded-2xl px-4 py-3 text-left text-base text-muted hover:bg-surface-2">
              Sign out ({session.email})
            </button>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
