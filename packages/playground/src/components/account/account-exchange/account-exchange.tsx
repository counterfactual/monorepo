import { Component, Element, Prop, State } from "@stencil/core";

import AccountTunnel from "../../../data/account";

@Component({
  tag: "account-exchange",
  styleUrl: "account-exchange.scss",
  shadow: true
})
export class AccountExchange {
  @Element() el!: HTMLStencilElement;
  @Prop() availableDeposit: number = 0;
  @Prop() balance: number = 0;
  @Prop() updateAccount: (e) => void = e => {};
  @State() depositValue: number | string = "";
  @State() withdrawValue: number | string = "";

  deposit(e) {
    this.updateAccount({
      balance: this.balance + parseFloat(e.target.value)
    });
    this.depositValue = "";
  }

  withdraw(e) {
    this.updateAccount({
      balance: this.balance - parseFloat(e.target.value)
    });
    this.withdrawValue = "";
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

AccountTunnel.injectProps(AccountExchange, ["balance", "updateAccount"]);
