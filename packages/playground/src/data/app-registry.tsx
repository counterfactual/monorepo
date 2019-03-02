import { createProviderConsumer } from "@stencil/state-tunnel";

import { AppDefinition } from "../types";

export interface AppRegistryState {
  apps: AppDefinition[];
  canUseApps: boolean;
  updateAppRegistry?(data: Partial<AppRegistryState>): Promise<void>;
}

export default createProviderConsumer<AppRegistryState>(
  { apps: [], canUseApps: false },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
