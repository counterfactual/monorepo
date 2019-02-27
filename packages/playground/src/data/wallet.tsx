import { createProviderConsumer } from "@stencil/state-tunnel";

export interface WalletState {
  signer?: Signer;
  provider?: Web3Provider;
  hasDetectedNetwork?: boolean;
  network?: string;
  connected?: boolean;
  web3Detected?: boolean;
  web3Enabled?: boolean;
  metamaskUnlocked?: boolean;
  networkPermitted?: boolean;
  updateWalletConnection?(data: WalletState): Promise<void>;
}

export default createProviderConsumer<WalletState>({}, (subscribe, child) => (
  <context-consumer subscribe={subscribe} renderer={child} />
));
