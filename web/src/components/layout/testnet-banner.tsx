import { DEMO_MODE } from "@/lib/web3/contracts";

export function TestnetBanner() {
  return (
    <div className="bg-stage px-4 py-2 text-center text-[13px] text-stage-fg">
      <span className="font-medium">BSC Testnet</span>
      <span className="opacity-70"> · mock peso token (tPHP), no real money</span>
      {DEMO_MODE ? <span className="hidden opacity-70 sm:inline"> · demo mode: transactions are simulated</span> : null}
    </div>
  );
}
