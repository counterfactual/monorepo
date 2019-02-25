import { Node } from "@counterfactual/types";
import { createProviderConsumer } from "@stencil/state-tunnel";

import { ErrorMessage, UserSession } from "../types";

export type AccountState = {
  user: UserSession;
  error?: ErrorMessage;
  accountBalance?: number;
  balance?: number;
  unconfirmedBalance?: number;
  provider: Web3Provider;
  signer: Signer;
  pendingAccountFunding?: any;

  updateAccount?(data: AccountState): Promise<void>;
  login?(): Promise<UserSession>;
  getBalances?(): Promise<
    { balance: number; accountBalance: number } | undefined
  >;
  deposit?(
    value: string,
    multisigAddress: string
  ): Promise<Node.MethodResponse>;
  withdraw?(value: any): Promise<Node.MethodResponse>;
  waitForMultisig?(): void;
  autoLogin?(): Promise<void>;
};

export default createProviderConsumer<AccountState>(
  {} as AccountState,
  (subscribe, child) => (
    <context-consumer subscribe={subscribe} renderer={child} />
  )
);
