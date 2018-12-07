import { Component, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import { DepositChangeset } from "../../../types";

@Component({
  tag: "account-deposit",
  styleUrl: "account-deposit.scss",
  shadow: true
})
export class AccountDeposit {
  @Prop() balance: number = 0;
  @Prop() history: RouterHistory = {} as RouterHistory;

  changeset: DepositChangeset = {};

  change(key, event) {
    this.changeset[key] = event.target.value;
  }

  formSubmitionHandler() {
    console.log(this.changeset);
    this.history.push("/");
  }

  render() {
    return (
      <widget-screen>
        <div slot="header">Fund your account</div>

        <p class="details">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque
          eu risus sit amet nisi consectetur cursus id egestas arcu. Curabitur
          ornare nunc.
        </p>

        <form-container onFormSubmitted={e => this.formSubmitionHandler()}>
          <form-input
            type="number"
            unit="ETH"
            value={this.changeset.amount}
            onChange={e => this.change("amount", e)}
          >
            <div class="balance-label" slot="label">
              <div>Available Balance</div>
              <div>{this.balance} ETH</div>
            </div>
          </form-input>
          <form-button onButtonPressed={e => this.formSubmitionHandler()}>
            Proceed
          </form-button>
        </form-container>
      </widget-screen>
    );
  }
}
