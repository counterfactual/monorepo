import { Component, Element, Prop, State, Watch } from "@stencil/core";

import AccountTunnel from "../../../data/account";
import WalletTunnel from "../../../data/wallet";
import { UserSession } from "../../../types";

const NETWORK_NAME_URL_PREFIX_ON_ETHERSCAN = {
  "1": "",
  "3": "ropsten",
  "42": "kovan",
  "4": "rinkeby"
};

@Component({
  tag: "account-exchange",
  styleUrl: "account-exchange.scss",
  shadow: true
})
export class AccountExchange {
  @Element() el!: HTMLStencilElement;
  @Prop() user: UserSession = {} as UserSession;
  @Prop() balance: number = 0;
  @Prop() network: string = "";
  @Prop() accountBalance: number = 0;
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() deposit: (
    value: any,
    multisigAddress: string
  ) => Promise<any> = async () => ({});
  @Prop() withdraw: (value: any) => Promise<void> = async () => {};
  @Prop() getBalances: () => Promise<
    { balance: number; accountBalance: number } | undefined
  > = async () => undefined;

  removeError() {
    this.updateAccount({
      error: null
    });
  }

  @State() depositError: string = "";
  @State() withdrawalError: string = "";

  @Watch("user")
  async onUserAcquired() {
    if (this.user) {
      await this.getBalances();
    }
  }

  async onDepositClicked(e) {
    const amount = Number(e.target.value);

    if (amount <= 0 || amount > 1) {
      this.depositError =
        "Please enter a non-zero amount of no more than 1 ETH.";
    } else {
      await this.deposit(amount, this.user.multisigAddress);
    }
  }

  async onWithdrawClicked(e) {
    const amount = e.target.value as number;

    if (amount <= 0 || amount > this.balance) {
      this.withdrawalError =
        "Please enter a non-zero amount of no more than your balance.";
    } else {
      await this.withdraw(amount);
    }
  }

  getEtherscanURL() {
    return `https://${
      NETWORK_NAME_URL_PREFIX_ON_ETHERSCAN[this.network]
    }.etherscan.io/address/${this.user.multisigAddress}`;
  }

  render() {
    return [
      <layout-header />,
      <div class="form-containers">
        <div class="form-container">
          <h1>Deposit ETH</h1>
          <account-eth-form
            onSubmit={this.onDepositClicked.bind(this)}
            button="Deposit"
            error={this.depositError}
            available={this.accountBalance}
            max={1}
          />
        </div>

        <div class="form-container">
          <h1>Withdraw ETH</h1>
          <account-eth-form
            onSubmit={this.onWithdrawClicked.bind(this)}
            button="Withdraw"
            error={this.withdrawalError}
            available={this.balance}
          />
        </div>
      </div>,
      <div class="container">
        <p>
          <a target="_blank" href={this.getEtherscanURL()}>
            View on Etherscan
          </a>
        </p>
      </div>
    ];
  }
}

AccountTunnel.injectProps(AccountExchange, [
  "accountBalance",
  "balance",
  "updateAccount",
  "user",
  "deposit",
  "withdraw",
  "getBalances"
]);

WalletTunnel.injectProps(AccountExchange, ["network"]);
