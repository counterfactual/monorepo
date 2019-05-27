import { createProviderConsumer } from "@stencil/state-tunnel";

import { AppDefinition } from "../types";

export interface ChallengeRegistryState {
  apps: AppDefinition[];
  canUseApps: boolean;
  updateChallengeRegistry?(data: Partial<ChallengeRegistryState>): Promise<void>;
  schemaVersion: string;
  maintenanceMode: boolean;
}

export default createProviderConsumer<ChallengeRegistryState>(
  { apps: [], canUseApps: false, maintenanceMode: false, schemaVersion: "0" },
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
