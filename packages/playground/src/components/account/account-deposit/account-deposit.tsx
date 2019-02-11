import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../../data/account";
import { UserSession } from "../../../types";

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
  @Prop() signer: Signer = {} as Signer;
  @Prop() provider: Web3Provider = {} as Web3Provider;

  @State() error: string = "";
  @State() amountDeposited;

  async componentWillLoad() {
    this.balance = parseFloat(
      ethers.utils.formatEther((await this.signer.getBalance()).toString())
    );
  }

  async formSubmitionHandler(e) {
    this.amountDeposited = ethers.utils.parseEther(e.target.value);

    try {
      const tx = {
        to: this.user.multisigAddress,
        value: this.amountDeposited
      };
      const gasEstimate = await this.provider.estimateGas(tx);
      await this.signer.sendTransaction({
        ...tx,
        gasPrice: gasEstimate
      });

      this.updateAccount({
        unconfirmedBalance: parseFloat(
          ethers.utils.formatEther(this.amountDeposited)
        )
      });

      this.history.push("/");
    } catch (error) {
      this.error = error.message;
    }
  }

  render() {
    return (
      <widget-screen exitable={false}>
        <div slot="header">Fund your account</div>

        <p class="details">
          In order to use the Playground dApps, you need to deposit funds into
          your account. Please enter how much ETH you want to transfer to it:
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

AccountTunnel.injectProps(AccountDeposit, [
  "balance",
  "updateAccount",
  "user",
  "signer"
]);
