import { Component, Element, Prop, State, Watch } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../../data/account";
import WalletTunnel from "../../../data/wallet";
import { UserSession } from "../../../types";

const HUB_IS_DEPOSITING_ALERT =
  "The hub is currently making a deposit in the channel. Currently, this demo does not support asyncronous deposits.";

@Component({
  tag: "account-exchange",
  styleUrl: "account-exchange.scss",
  shadow: true
})
export class AccountExchange {
  @Element() el!: HTMLStencilElement;
  @Prop() user: UserSession = {} as UserSession;
  @Prop() ethFreeBalanceWei: BigNumber = { _hex: "0x00" } as BigNumber;
  @Prop() ethMultisigBalance: BigNumber = { _hex: "0x00" } as BigNumber;
  @Prop() ethWeb3WalletBalance: BigNumber = { _hex: "0x00" } as BigNumber;
  @Prop() ethPendingDepositTxHash: string = "";
  @Prop() ethPendingDepositAmountWei: BigNumber = { _hex: "0x00" } as BigNumber;
  @Prop() ethPendingWithdrawalTxHash: string = "";
  @Prop() ethPendingWithdrawalAmountWei: BigNumber = {
    _hex: "0x00"
  } as BigNumber;
  @Prop() network: string = "";
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() deposit: (value: string) => Promise<any> = async () => ({});
  @Prop() withdraw: (value: string) => Promise<void> = async () => {};
  @Prop() getBalances: () => Promise<
    { ethMultisigBalance: BigNumber; ethFreeBalanceWei: BigNumber } | undefined
  > = async () => undefined;
  @Prop() getEtherscanAddressURL: (address: string) => string = () => "";
  @Prop() getEtherscanTxURL: (tx: string) => string = () => "";
  @Prop() history: RouterHistory = {} as RouterHistory;

  componentDidUpdate() {
    if (!this.user || !this.user.id) {
      this.history.push("/");
      return;
    }
  }

  removeError() {
    this.updateAccount({
      error: null
    });
  }

  @State() depositError: string = "";
  @State() withdrawalError: string = "";

  get isDepositPending() {
    return this.ethPendingDepositTxHash && this.ethPendingDepositAmountWei;
  }

  get isWithdrawalPending() {
    return (
      this.ethPendingWithdrawalTxHash && this.ethPendingWithdrawalAmountWei
    );
  }

  @Watch("user")
  async onUserAcquired() {
    if (this.user) {
      await this.getBalances();
    }
  }

  async onDepositClicked(e) {
    try {
      await this.deposit(ethers.utils.parseEther(e.target.value));
    } catch (e) {
      if (e.toString().includes("Cannot deposit while another deposit")) {
        window.alert(HUB_IS_DEPOSITING_ALERT);
      } else {
        throw e;
      }
    }
  }

  async onWithdrawClicked(e) {
    try {
      await this.withdraw(ethers.utils.parseEther(e.target.value));
    } catch (e) {
      if (e.toString().includes("Cannot withdraw while another deposit")) {
        window.alert(HUB_IS_DEPOSITING_ALERT);
      } else {
        throw e;
      }
    }
  }

  render() {
    return [
      <layout-header />,
      <div class="form-containers">
        <div class="form-container">
          <h1>Deposit ETH</h1>
          <account-eth-form
            onSubmit={this.onDepositClicked.bind(this)}
            button="Deposit"
            error={this.depositError}
            available={this.ethWeb3WalletBalance}
            min={0.01}
            max={1}
          />
        </div>

        <div class="form-container">
          <h1>Withdraw ETH</h1>
          <account-eth-form
            onSubmit={this.onWithdrawClicked.bind(this)}
            button="Withdraw"
            error={this.withdrawalError}
            available={this.ethFreeBalanceWei}
            min={0}
            max={Number(ethers.utils.formatEther(this.ethFreeBalanceWei))}
          />
        </div>
      </div>,
      <div class="container">
        <p>
          {this.user.multisigAddress ? (
            <a
              target="_blank"
              href={this.getEtherscanAddressURL(this.user.multisigAddress)}
            >
              View State Channels Wallet on Etherscan
            </a>
          ) : (
            <a
              target="_blank"
              href={this.getEtherscanTxURL(this.user.transactionHash)}
            >
              View State Channels Wallet Deployment Transaction on Etherscan
            </a>
          )}
        </p>

        {/* Debug UI for Deposits */}
        {this.isDepositPending ? (
          <a
            href={this.getEtherscanTxURL(this.ethPendingDepositTxHash)}
            target="_blank"
          >
            💰 Pending Deposit of{" "}
            {ethers.utils.formatEther(this.ethPendingDepositAmountWei)} Wei
          </a>
        ) : null}

        {/* Debug UI for Withdrawal */}
        {this.isWithdrawalPending ? (
          <a
            href={this.getEtherscanTxURL(this.ethPendingWithdrawalTxHash)}
            target="_blank"
          >
            💸 Pending Withdrawal of{" "}
            {ethers.utils.formatEther(this.ethPendingWithdrawalAmountWei)} Wei
          </a>
        ) : null}
      </div>
    ];
  }
}

AccountTunnel.injectProps(AccountExchange, [
  "ethFreeBalanceWei",
  "ethMultisigBalance",
  "ethPendingDepositTxHash",
  "ethPendingDepositAmountWei",
  "ethPendingWithdrawalTxHash",
  "ethPendingWithdrawalAmountWei",
  "updateAccount",
  "user",
  "deposit",
  "withdraw",
  "getBalances"
]);

WalletTunnel.injectProps(AccountExchange, [
  "network",
  "ethWeb3WalletBalance",
  "getEtherscanAddressURL",
  "getEtherscanTxURL"
]);
