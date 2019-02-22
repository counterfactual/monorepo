import { Node } from "@counterfactual/types";
import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../../data/account";
import CounterfactualNode from "../../../data/counterfactual";
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

  @State() error: string = "";
  @State() amountDeposited;

  get node() {
    return CounterfactualNode.getInstance();
  }

  async componentWillLoad() {
    this.balance = parseFloat(
      ethers.utils.formatEther((await this.signer.getBalance()).toString())
    );
  }

  async formSubmitionHandler(e) {
    this.amountDeposited = e.target.value;

    try {
      if (this.user.multisigAddress) {
        await this.node.call(Node.MethodName.DEPOSIT, {
          type: Node.MethodName.DEPOSIT,
          requestId: window["uuid"](),
          params: {
            multisigAddress: this.user.multisigAddress,
            amount: ethers.utils.parseEther(this.amountDeposited),
            notifyCounterparty: true
          } as Node.DepositParams
        });

        this.updateAccount({
          unconfirmedBalance: parseFloat(this.amountDeposited)
        });
      } else {
        this.updateAccount({
          pendingAccountFunding: parseFloat(this.amountDeposited)
        });
      }
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
          onSubmit={e => this.formSubmissionHandler(e)}
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
