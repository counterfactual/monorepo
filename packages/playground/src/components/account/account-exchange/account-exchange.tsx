import { Component, Element, Prop, State, Watch } from "@stencil/core";
import { RouterHistory } from "@stencil/router";
import { BigNumber, BigNumberish } from "ethers/utils";

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
  @Prop() ethFreeBalanceWei: BigNumberish = 0;
  @Prop() ethMultisigBalance: BigNumberish = 0;
  @Prop() ethWeb3WalletBalance: BigNumberish = 0;
  @Prop() ethPendingDepositTxHash: string = "";
  @Prop() ethPendingDepositAmountWei: BigNumberish = 0;
  @Prop() ethPendingWithdrawalTxHash: string = "";
  @Prop() ethPendingWithdrawalAmountWei: BigNumberish = 0;
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

  @Watch("ethPendingDepositTxHash")
  onEthPendingDepositTxHashChanged() {
    this.updateDepositPendingState();
  }

  @Watch("ethPendingDepositAmountWei")
  onEthPendingDepositAmountWeiChanged() {
    this.updateDepositPendingState();
  }

  @Watch("ethPendingWithdrawalTxHash")
  onEthPendingWithdrawalTxHashChanged() {
    this.updateWithdrawalPendingState();
  }

  @Watch("ethPendingWithdrawalAmountWei")
  onEthPendingWithdrawalAmountWeiChanged() {
    this.updateWithdrawalPendingState();
  }

  @State() depositError: string = "";
  @State() withdrawalError: string = "";

  @State() isDepositPending: Boolean = false;
  @State() isWithdrawalPending: Boolean = false;

  updateDepositPendingState() {
    this.isDepositPending =
      Boolean(this.ethPendingDepositTxHash) &&
      Boolean(this.ethPendingDepositAmountWei);
  }

  updateWithdrawalPendingState() {
    this.isWithdrawalPending =
      Boolean(this.ethPendingWithdrawalTxHash) &&
      Boolean(this.ethPendingWithdrawalAmountWei);
  }

  @Watch("user")
  async onUserAcquired() {
    if (this.user) {
      await this.getBalances();
    }
  }

  async onDepositClicked(e) {
    try {
      await this.deposit(
        window["ethers"].utils.parseEther(e.target.value).toHexString()
      );
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
      await this.withdraw(
        window["ethers"].utils.parseEther(e.target.value).toHexString()
      );
    } catch (e) {
      if (e.toString().includes("Cannot withdraw while another deposit")) {
        window.alert(HUB_IS_DEPOSITING_ALERT);
      } else {
        throw e;
      }
    }
  }

  getMultisigEtherscanLink() {
    return this.user.multisigAddress ? (
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
    );
  }

  getPendingDepositEtherscanLink() {
    const Zero = window["ethers"].constants.Zero;
    const ethPendingDepositAmountWei = this.ethPendingDepositAmountWei || Zero;

    return this.isDepositPending ? (
      <a
        href={this.getEtherscanTxURL(this.ethPendingDepositTxHash)}
        target="_blank"
      >
        💰 Pending Deposit of{" "}
        {window["ethers"].utils.formatEther(ethPendingDepositAmountWei)} ETH
      </a>
    ) : null;
  }

  getPendingWithdrawalEtherscanLink() {
    const Zero = window["ethers"].constants.Zero;
    const ethPendingWithdrawalAmountWei =
      this.ethPendingWithdrawalAmountWei || Zero;

    return this.isWithdrawalPending ? (
      <a
        href={this.getEtherscanTxURL(this.ethPendingWithdrawalTxHash)}
        target="_blank"
      >
        💸 Pending Withdrawal of{" "}
        {window["ethers"].utils.formatEther(ethPendingWithdrawalAmountWei)}
        ETH
      </a>
    ) : null;
  }

  render() {
    const Zero = window["ethers"].constants.Zero;
    const ethFreeBalanceWei = this.ethFreeBalanceWei || Zero;

    return [
      <layout-header />,
      <div class="form-containers">
        <div class="form-container">
          <h1>Deposit ETH</h1>
          <account-eth-form
            onSubmit={this.onDepositClicked.bind(this)}
            button={this.isDepositPending ? "Deposit in progress" : "Deposit"}
            disabled={this.isDepositPending ? true : false}
            loading={this.isDepositPending ? true : false}
            provideFaucetLink={true}
            error={this.depositError}
            available={window["ethers"].utils.bigNumberify(
              this.ethWeb3WalletBalance
            )}
            min={0.1}
            max={1}
          />
        </div>

        <div class="form-container">
          <h1>Withdraw ETH</h1>
          <account-eth-form
            onSubmit={this.onWithdrawClicked.bind(this)}
            button={
              this.isWithdrawalPending ? "Withdrawal in progress" : "Withdraw"
            }
            disabled={this.isWithdrawalPending ? true : false}
            loading={this.isWithdrawalPending ? true : false}
            error={this.withdrawalError}
            available={window["ethers"].utils.bigNumberify(ethFreeBalanceWei)}
            min={0}
            max={Number(window["ethers"].utils.formatEther(ethFreeBalanceWei))}
          />
        </div>
        <div class="container">
          <p>{this.getMultisigEtherscanLink()}</p>

          {/* Debug UI for Deposits */}
          <p>{this.getPendingDepositEtherscanLink()}</p>

          {/* Debug UI for Withdrawal */}
          <p>{this.getPendingWithdrawalEtherscanLink()}</p>
        </div>
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
