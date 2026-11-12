import { http, createConfig } from "wagmi";
import { bscTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [bscTestnet],
  connectors: [injected()],
  transports: { [bscTestnet.id]: http() },
  ssr: true,
});

export const CHAIN = bscTestnet;

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
