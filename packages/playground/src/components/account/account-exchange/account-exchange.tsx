import { Component, Prop } from "@stencil/core";

@Component({
  tag: "account-exchange",
  styleUrl: "account-exchange.scss",
  shadow: true
})
export class AccountExchange {
  @Prop() availableDeposit: number = 0;
  @Prop() availableWithdraw: number = 0;

  deposit(e) {
    console.log(e.target.value);
  }

  withdraw(e) {
    console.log(e.target.value);
  }

  render() {
    return [
      <app-nav />,
      <div class="form-containers">
        <div class="form-container">
          <widget-header>Deposit</widget-header>
          <account-eth-form
            onSubmit={e => this.deposit(e)}
            button="Deposit"
            available={this.availableDeposit}
          />
        </div>

        <div class="form-container">
          <widget-header>Withdraw</widget-header>
          <account-eth-form
            onSubmit={e => this.withdraw(e)}
            button="Withdraw"
            available={this.availableWithdraw}
          />
        </div>
      </div>
    ];
  }
}
