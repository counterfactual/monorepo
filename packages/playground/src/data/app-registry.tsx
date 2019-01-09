import { createProviderConsumer } from "@stencil/state-tunnel";

import { AppDefinition } from "../types";

export interface AppRegistryState {
  apps: AppDefinition[];
  updateAppRegistry?(data: AppRegistryState): Promise<void>;
}

export default createProviderConsumer<AppRegistryState>(
  { apps: [] },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
