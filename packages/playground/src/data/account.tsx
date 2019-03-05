import { Node } from "@counterfactual/types";
import { createProviderConsumer } from "@stencil/state-tunnel";

import { ErrorMessage, UserSession } from "../types";

export type AccountState = {
  user: UserSession;
  error?: ErrorMessage;

  precommitedDepositAmountWei?: BigNumber;

  ethMultisigBalance: BigNumber;
  ethFreeBalanceWei?: BigNumber;
  ethCounterpartyFreeBalanceWei?: BigNumber;

  ethPendingDepositAmountWei?: BigNumber;
  ethPendingWithdrawalAmountWei?: BigNumber;

  ethPendingDepositTxHash?: string;
  ethPendingWithdrawalTxHash?: string;

  updateAccount?(data: Partial<AccountState>): Promise<void>;
  login?(): Promise<UserSession>;
  logout?(): void;
  getBalances?(): Promise<
    { ethMultisigBalance: BigNumber; ethFreeBalanceWei: BigNumber } | undefined
  >;
  deposit?(valueInWei: BigNumber): Promise<Node.MethodResponse>;
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
