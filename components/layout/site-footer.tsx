"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";

// Sign-up is a focused task: no site footer under it. Decided by route, not by a CSS :has()
// check, because Next keeps visited pages in the DOM (hidden) and that would hide it everywhere.
const NO_FOOTER = ["/sign-in"];

export function SiteFooter() {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  if (NO_FOOTER.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return (
    <footer className="site-footer mt-24 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm text-muted">
            Fund research. Pay honest answers. Built for BCC 2026 by EJ Bagayan, Victor Condicion and Stephen Nera.
          </p>
          <p className="mt-3 text-xs text-subtle">
            Answers and emails stay off-chain; only wallet addresses and reason hashes go on-chain. Handled under the Data Privacy Act of 2012.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/rubric" className="text-muted hover:text-fg">Screening rubric</Link>
          <Link href="/#how" className="text-muted hover:text-fg">How it works</Link>
          <Link href="/privacy" className="text-muted hover:text-fg">Privacy</Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle dark mode"
          >
            {/* CSS picks the label so server and client markup always match */}
            <Moon className="dark:hidden" />
            <Sun className="hidden dark:block" />
            <span className="dark:hidden">Dark</span>
            <span className="hidden dark:inline">Light</span>
          </Button>
        </div>
      </div>
    </footer>
  );
}
