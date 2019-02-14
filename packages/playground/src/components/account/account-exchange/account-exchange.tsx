import { Component, Element, Prop, Watch } from "@stencil/core";

import AccountTunnel from "../../../data/account";
import { UserSession } from "../../../types";

@Component({
  tag: "account-exchange",
  styleUrl: "account-exchange.scss",
  shadow: true
})
export class AccountExchange {
  @Element() el!: HTMLStencilElement;
  @Prop() user: UserSession = {} as UserSession;
  @Prop() balance: number = 0;
  @Prop() accountBalance: number = 0;
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() deposit: (value: any) => Promise<any> = async () => ({});
  @Prop() withdraw: (value: any) => Promise<void> = async () => {};
  @Prop() getBalances: () => Promise<
    { balance: number; accountBalance: number } | undefined
  > = async () => undefined;

  removeError() {
    this.updateAccount({
      error: null
    });
  }

  @Watch("user")
  async onUserAcquired() {
    if (this.user) {
      await this.getBalances();
    }
  }

  async onDepositClicked(e) {
    debugger;
    const amount = e.target.value;
    await this.deposit(amount);
  }

  async onWithdrawClicked(e) {
    debugger;
    const amount = e.target.value;
    await this.withdraw(amount);
  }

  render() {
    return [
      <layout-header />,
      <div class="form-containers">
        <div class="form-container">
          <widget-header>Deposit</widget-header>
          <account-eth-form
            onSubmit={this.onDepositClicked.bind(this)}
            button="Deposit"
            available={this.accountBalance}
          />
        </div>

        <div class="form-container">
          <widget-header>Withdraw</widget-header>
          <account-eth-form
            onSubmit={this.onWithdrawClicked.bind(this)}
            button="Withdraw"
            available={this.balance}
          />
        </div>
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
