"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Logo } from "./logo";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/rubric", label: "Rubric" },
];

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
            <ButtonLink href="/#start" variant="dark" size="sm">
              Get started
            </ButtonLink>
          </div>
          <div className="ml-auto flex items-center gap-1 md:hidden">
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
