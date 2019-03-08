import { Node } from "@counterfactual/types";
import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../../data/account";
import CounterfactualNode from "../../../data/counterfactual";
import WalletTunnel from "../../../data/wallet";
import { UserSession } from "../../../types";

@Component({
  tag: "account-deposit",
  styleUrl: "account-deposit.scss",
  shadow: true
})
export class AccountDeposit {
  @Element() el!: HTMLStencilElement;

  @Prop() ethWeb3WalletBalance: BigNumber = { _hex: "0x00" } as BigNumber;
  @Prop() user: UserSession = {} as UserSession;
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() signer: Signer = {} as Signer;

  @State() error: string = "";
  @State() amountDeposited;

  componentDidUpdate() {
    if (!this.user || !this.user.id) {
      this.history.push("/");
      return;
    }
  }

  get node() {
    return CounterfactualNode.getInstance();
  }

  async formSubmitionHandler(e) {
    this.amountDeposited = ethers.utils.parseEther(e.target.value);

    try {
      if (this.user.multisigAddress) {
        this.node.once(Node.EventName.DEPOSIT_STARTED, args => {
          this.updateAccount({
            ethPendingDepositTxHash: args.txHash,
            ethPendingDepositAmountWei: this.amountDeposited
          });
        });

        await this.node.call(Node.MethodName.DEPOSIT, {
          type: Node.MethodName.DEPOSIT,
          requestId: window["uuid"](),
          params: {
            multisigAddress: this.user.multisigAddress,
            amount: this.amountDeposited,
            notifyCounterparty: true
          } as Node.DepositParams
        });

        this.updateAccount({
          ethPendingDepositAmountWei: undefined,
          precommitedDepositAmountWei: undefined
        });
      } else {
        this.updateAccount({
          precommitedDepositAmountWei: this.amountDeposited
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
          In order to use the Playground Dapps, you need to deposit funds into
          your account. Please enter how much ETH you want to deposit:
        </p>

        <account-eth-form
          onSubmit={this.formSubmitionHandler.bind(this)}
          autofocus={true}
          provideFaucetLink={true}
          button="Deposit"
          available={this.ethWeb3WalletBalance}
          min={0}
          max={Number(ethers.utils.formatEther(this.ethWeb3WalletBalance))}
          error={this.error}
        />
      </widget-screen>
    );
  }
}

AccountTunnel.injectProps(AccountDeposit, ["updateAccount", "user"]);
WalletTunnel.injectProps(AccountDeposit, ["signer", "ethWeb3WalletBalance"]);
