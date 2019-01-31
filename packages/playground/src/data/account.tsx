import { createProviderConsumer } from "@stencil/state-tunnel";

import { ErrorMessage, UserSession } from "../types";

export type AccountState = {
  user: UserSession;
  error?: ErrorMessage;
  accountBalance?: number;
  balance?: number;
  updateAccount?(data: AccountState): Promise<void>;
};

export default createProviderConsumer<AccountState>(
  {} as AccountState,
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
