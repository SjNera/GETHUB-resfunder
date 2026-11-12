"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { WagmiProvider } from "wagmi";
import { useDemo } from "@/lib/data/store";
import { wagmiConfig } from "@/lib/web3/config";

function DemoInit() {
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useDemo.persist.rehydrate()).then(() => {
      if (!cancelled) useDemo.getState().init();
    });
    // Unresolved reviews pay the respondent after 24 h.
    const t = setInterval(() => useDemo.getState().runTimeouts(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);
  return null;
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="bottom-center"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      toastOptions={{ classNames: { toast: "!rounded-2xl !border-border !bg-surface !text-fg", description: "!text-muted" } }}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DemoInit />
          {children}
          <ThemedToaster />
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
