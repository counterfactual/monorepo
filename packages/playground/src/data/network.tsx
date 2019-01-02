import { createProviderConsumer } from "@stencil/state-tunnel";

export interface NetworkState {
  network?: string;
  connected?: boolean;
  updateNetwork?(data: NetworkState): Promise<void>;
}

export default createProviderConsumer<NetworkState>(
  { network: "Unknown network" },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
