"use client";

import { Check, Copy, Wallet as WalletIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  connectAndSign,
  type ConnectStage,
  getProvider,
  isPhone,
  metamaskDeepLink,
  parsePastedAddress,
  shortAddress,
  WalletError,
} from "@/lib/auth/metamask";
import { type Wallet, walletOwner } from "@/lib/auth/store";
import { FieldError, FieldLabel, Helper, TextInput } from "./fields";

const WAITING: Record<ConnectStage, string> = {
  account: "Waiting for MetaMask…",
  network: "Switch to BSC Testnet in MetaMask…",
  sign: "Sign the message in MetaMask…",
};

export function MetaMaskFox({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M21 3l-7.5 5.5 1.4-3.3z" fill="#e2761b" />
      <path d="M3 3l7.4 5.6-1.3-3.4zM18.3 16.4l-2 3 4.3 1.2 1.2-4.1zM2.2 16.5l1.2 4.1 4.3-1.2-2-3z" fill="#e4761b" />
      <path d="M7.5 11.3l-1.2 1.8 4.3.2-.1-4.6zM16.5 11.3l-3-2.7-.1 4.7 4.3-.2z" fill="#e4761b" />
      <path d="M7.7 19.4l2.6-1.3-2.2-1.7zM13.7 18.1l2.6 1.3-.4-3z" fill="#d7c1b3" />
    </svg>
  );
}

export function WalletCard({ wallet }: { wallet: Wallet }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-border-strong bg-surface p-4">
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${wallet.verified ? "bg-pay text-white" : "bg-review-soft text-review"}`}>
        {wallet.verified ? <Check className="size-5" strokeWidth={3} /> : <WalletIcon className="size-4" />}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[16px] font-semibold">{shortAddress(wallet.address)}</p>
        <p className="text-sm text-muted">{wallet.verified ? "MetaMask · BSC Testnet · verified" : "Pasted · not verified"}</p>
      </div>
      <button
        type="button"
        className="pressable ml-auto inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-brand-ink [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-2"
        onClick={() => {
          navigator.clipboard?.writeText(wallet.address).then(() => setCopied(true), () => {});
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        <span key={copied ? "copied" : "copy"} className="inline-flex items-center gap-1.5 animate-[swap_150ms_var(--ease-out)] motion-reduce:animate-none">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </span>
      </button>
    </div>
  );
}

/**
 * Connect MetaMask (switch to BSC Testnet, sign a free message), with install
 * help and a paste fallback. Calls onLinked once a wallet is accepted.
 */
export function WalletConnect({
  email,
  current,
  onLinked,
}: {
  email: string;
  current?: Wallet;
  onLinked: (w: Wallet) => void;
}) {
  const [busy, setBusy] = useState<ConnectStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noProvider, setNoProvider] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const accept = (address: `0x${string}`, verified: boolean) => {
    const owner = walletOwner(address);
    if (owner && owner !== email) {
      setError("This wallet is linked to another ResFunder account.");
      return false;
    }
    onLinked({ address, verified, linkedAt: new Date().toISOString() });
    return true;
  };

  const connect = async () => {
    setError(null);
    if (!getProvider()) {
      setNoProvider(true);
      return;
    }
    try {
      const address = await connectAndSign(email, setBusy);
      accept(address, true);
    } catch (e) {
      if (e instanceof WalletError && e.kind === "no_provider") setNoProvider(true);
      else setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {current ? <WalletCard wallet={current} /> : null}

      <Button variant="dark" size="lg" className="w-full" onClick={connect} disabled={busy !== null} aria-live="polite">
        <MetaMaskFox className="size-5" />
        {busy ? WAITING[busy] : current ? "Connect a different wallet" : "Connect MetaMask"}
      </Button>
      <FieldError>{error}</FieldError>

      {noProvider ? (
        <div className="rounded-3xl border border-border bg-surface p-5 text-[15px]">
          <p className="font-semibold">MetaMask isn&apos;t in this browser</p>
          {isPhone() ? (
            <>
              <Helper className="mt-1">Open this page in the MetaMask app. Its built-in browser can connect.</Helper>
              <a href={metamaskDeepLink()} className="mt-3 inline-flex font-medium text-brand-ink [@media(hover:hover)_and_(pointer:fine)]:hover:underline">
                Open in MetaMask app
              </a>
            </>
          ) : (
            <>
              <Helper className="mt-1">Install the MetaMask extension, then come back to this tab.</Helper>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full border border-border-strong px-4 text-sm font-medium [@media(hover:hover)_and_(pointer:fine)]:hover:border-fg/40">
                  Install MetaMask
                </a>
                <Button size="sm" variant="ghost" className="h-10" onClick={connect}>
                  I&apos;ve installed it
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {!pasting ? (
        <p className="text-center text-sm text-muted">
          No MetaMask?{" "}
          <button type="button" onClick={() => setPasting(true)} className="font-medium text-brand-ink [@media(hover:hover)_and_(pointer:fine)]:hover:underline">
            Paste a wallet address instead
          </button>
        </p>
      ) : (
        <form
          className="rounded-3xl border border-border bg-surface p-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const r = parsePastedAddress(pasted);
            if (!r.ok) return setPasteError(r.error);
            if (accept(r.address, false)) {
              setPasting(false);
              setPasted("");
            }
          }}
        >
          <FieldLabel htmlFor="paste-address">Wallet address</FieldLabel>
          <TextInput
            id="paste-address"
            placeholder="0x…"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              setPasteError(null);
            }}
            aria-invalid={!!pasteError}
          />
          <FieldError>{pasteError}</FieldError>
          <Helper>Make sure it&apos;s yours. Payments to a wrong address can&apos;t be undone. A pasted wallet can&apos;t answer paid surveys until you connect and sign with it.</Helper>
          <div className="mt-4 flex gap-2">
            <Button type="submit" size="sm" variant="outline" className="h-10">
              Use this address
            </Button>
            <Button size="sm" variant="ghost" className="h-10" onClick={() => setPasting(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
