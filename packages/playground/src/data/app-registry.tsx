import { createProviderConsumer } from "@stencil/state-tunnel";

import { AppDefinition } from "../types";

export interface AppRegistryState {
  apps: AppDefinition[];
  canUseApps: boolean;
  updateAppRegistry?(data: Partial<AppRegistryState>): Promise<void>;
  schemaVersion: string;
  maintenanceMode: boolean;
}

export default createProviderConsumer<AppRegistryState>(
  { apps: [], canUseApps: false, maintenanceMode: false, schemaVersion: "0" },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
