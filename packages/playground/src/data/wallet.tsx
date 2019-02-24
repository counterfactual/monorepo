import { createProviderConsumer } from "@stencil/state-tunnel";

export interface WalletState {
  hasDetectedNetwork?: boolean;
  network?: string;
  connected?: boolean;
  web3Detected?: boolean;
  web3Enabled?: boolean;
  metamaskUnlocked?: boolean;
  networkPermitted?: boolean;
  updateNetwork?(data: WalletState): Promise<void>;
}

export default createProviderConsumer<WalletState>(
  { network: "Unknown network", web3Detected: typeof web3 !== undefined },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
