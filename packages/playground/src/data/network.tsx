import { createProviderConsumer } from "@stencil/state-tunnel";

export interface NetworkState {
  hasDetectedNetwork?: boolean;
  network?: string;
  connected?: boolean;
  web3Detected?: boolean;
  web3Enabled?: boolean;
  metamaskUnlocked?: boolean;
  networkPermitted?: boolean;
  updateNetwork?(data: NetworkState): Promise<void>;
}

export default createProviderConsumer<NetworkState>(
  { network: "Unknown network", web3Detected: typeof web3 !== undefined },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
