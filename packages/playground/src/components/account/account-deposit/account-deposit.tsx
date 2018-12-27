import { Component, Element, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../../data/account";

@Component({
  tag: "account-deposit",
  styleUrl: "account-deposit.scss",
  shadow: true
})
export class AccountDeposit {
  @Element() el!: HTMLStencilElement;
  @Prop() balance: number = 0;
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() history: RouterHistory = {} as RouterHistory;

  formSubmitionHandler(e) {
    console.log(e.target.value);
    this.updateAccount({
      balance: parseFloat(e.target.value)
    });
    this.history.push("/");
  }

  render() {
    return (
      <widget-screen exitable={false}>
        <div slot="header">Fund your account</div>

        <p class="details">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque
          eu risus sit amet nisi consectetur cursus id egestas arcu. Curabitur
          ornare nunc.
        </p>

        <account-eth-form
          onSubmit={e => this.formSubmitionHandler(e)}
          button="Proceed"
          available={this.balance}
        />
      </widget-screen>
    );
  }
}

AccountTunnel.injectProps(AccountDeposit, ["balance", "updateAccount"]);
