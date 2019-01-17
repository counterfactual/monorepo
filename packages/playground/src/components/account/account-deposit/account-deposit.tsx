import { UserSession } from "@counterfactual/playground-server";
import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../../data/account";

@Component({
  tag: "account-deposit",
  styleUrl: "account-deposit.scss",
  shadow: true
})
export class AccountDeposit {
  @Element() el!: HTMLStencilElement;
  @State() balance: number = 0;
  @Prop() user: UserSession = {} as UserSession;
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() history: RouterHistory = {} as RouterHistory;

  @State() error: string = "";
  @State() amountDeposited: string = "";

  componentWillLoad() {
    web3.eth.getBalance(
      this.user.ethAddress,
      web3.eth.defaultBlock,
      this.showBalance.bind(this)
    );
  }

  showBalance(error: Error, balance: BigNumber) {
    if (error) {
      // TODO: What happens if we can't get the account balance?
      return;
    }

    this.balance = parseFloat(ethers.utils.formatEther(balance.toString()));
  }

  formSubmitionHandler(e) {
    this.amountDeposited = ethers.utils.parseEther(e.target.value).toString();

    web3.eth.sendTransaction(
      {
        from: this.user.ethAddress,
        to: this.user.multisigAddress,
        value: this.amountDeposited
      },
      this.depositCompleted.bind(this)
    );
  }

  depositCompleted(error: Error, result: any) {
    if (error) {
      this.error = error.message;
      return;
    }

    this.updateAccount({
      balance: ethers.utils.formatEther(this.amountDeposited)
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
          error={this.error}
        />
      </widget-screen>
    );
  }
}

AccountTunnel.injectProps(AccountDeposit, ["balance", "updateAccount", "user"]);
