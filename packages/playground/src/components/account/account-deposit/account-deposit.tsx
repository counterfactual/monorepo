import { Component, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

@Component({
  tag: "account-deposit",
  styleUrl: "account-deposit.scss",
  shadow: true
})
export class AccountDeposit {
  @Prop() balance: number = 0;
  @Prop() history: RouterHistory = {} as RouterHistory;

  formSubmitionHandler(e) {
    console.log(e.target.value);
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
