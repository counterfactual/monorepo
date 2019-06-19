import { Component, Element, Prop } from "@stencil/core";
import { BigNumber } from "ethers/utils";

import AccountTunnel from "../../../../data/account";
import { UserSession } from "../../../../types";

@Component({
  tag: "header-balance",
  styleUrl: "header-balance.scss",
  shadow: true
})
export class HeaderBalance {
  @Element() el!: HTMLStencilElement;
  @Prop() ethFreeBalanceWei: BigNumber | number = 0;
  @Prop() ethPendingDepositAmountWei?: number;
  @Prop({ mutable: true }) user: UserSession = {} as UserSession;

  get ethBalance() {
    if (!this.ethFreeBalanceWei) {
      return "0.00 ETH";
    }

    return `${window["ethers"].utils.formatEther(this.ethFreeBalanceWei)} ETH`;
  }

  get hasethPendingDepositAmountWei() {
    return !isNaN(this.ethPendingDepositAmountWei as number);
  }

  render() {
    if (!this.user.id) return;

    let tooltip = "";

    if (this.hasethPendingDepositAmountWei) {
      tooltip = "We're waiting for the network to confirm your latest deposit.";
    }

    if (!this.user.multisigAddress) {
      tooltip =
        "We're configuring your state channel with the Playground. This can take 15-90 seconds, depending on network speed.";
    }

    return (
      <stencil-route-link url="/exchange">
        <header-account-info
          src="/assets/icon/crypto.svg"
          header="Balance"
          content={this.ethBalance}
          spinner={
            this.hasethPendingDepositAmountWei || !this.user.multisigAddress
          }
          tooltip={tooltip}
        />
      </stencil-route-link>
    );
  }
}

AccountTunnel.injectProps(HeaderBalance, [
  "ethFreeBalanceWei",
  "user",
  "ethPendingDepositAmountWei"
]);
