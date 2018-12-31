import { createProviderConsumer } from "@stencil/state-tunnel";

export interface AccountState {
  balance?: number;
  username?: string;
  email?: string;
  address?: string;
  updateAccount?(data: AccountState): Promise<void>;
}

export default createProviderConsumer<AccountState>({}, (subscribe, child) => (
  <context-consumer subscribe={subscribe} renderer={child} />
));
