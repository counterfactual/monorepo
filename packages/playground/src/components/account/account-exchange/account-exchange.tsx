import { UserSession } from "@counterfactual/playground-server";
import { Component, Element, Prop, State } from "@stencil/core";

import AccountTunnel from "../../../data/account";

interface TransactionArgs {
  from: string;
  to: string;
  value: string;
}

@Component({
  tag: "account-exchange",
  styleUrl: "account-exchange.scss",
  shadow: true
})
export class AccountExchange {
  @Element() el!: HTMLStencilElement;
  @Prop() user: UserSession = {} as UserSession;
  @Prop() availableDeposit: number = 0;
  @Prop() balance: number = 0;
  @Prop() updateAccount: (e) => void = e => {};
  @State() depositValue: number | string = "";
  @State() withdrawValue: number | string = "";

  depositTimeoutId: NodeJS.Timeout | undefined;

  deposit(e) {
    const value = e.target.value;
    const transactionArgs = {
      from: this.user.ethAddress,
      to: this.user.multisigAddress,
      value
    };
    this.initiateTransaction(parseFloat(value), transactionArgs);

    this.depositValue = "";
  }

  withdraw(e) {
    const value = e.target.value;
    const transactionArgs = {
      from: this.user.multisigAddress,
      to: this.user.ethAddress,
      value: `-${value}`
    };
    this.initiateTransaction(-parseFloat(value), transactionArgs);

    this.withdrawValue = "";
  }

  initiateTransaction(value: number, transactionArgs: TransactionArgs) {
    this.updateAccount({
      balance: this.balance + value
    });

    const timeoutId = setTimeout(() => {
      this.updateAccount({
        balance: this.balance - value
      });
    }, 60000);

    web3.eth.sendTransaction(
      transactionArgs,
      this.transactionCompleted.bind(this, timeoutId)
    );
  }

  transactionCompleted(transactionTimeoutId: NodeJS.Timeout) {
    clearTimeout(transactionTimeoutId);
  }

  render() {
    return [
      <layout-header />,
      <div class="form-containers">
        <div class="form-container">
          <widget-header>Deposit</widget-header>
          <account-eth-form
            onSubmit={e => this.deposit(e)}
            button="Deposit"
            available={this.availableDeposit}
            value={this.depositValue}
          />
        </div>

        <div class="form-container">
          <widget-header>Withdraw</widget-header>
          <account-eth-form
            onSubmit={e => this.withdraw(e)}
            button="Withdraw"
            available={this.balance}
            value={this.withdrawValue}
          />
        </div>
      </div>
    ];
  }
}

AccountTunnel.injectProps(AccountExchange, ["balance", "updateAccount", "user"]);
