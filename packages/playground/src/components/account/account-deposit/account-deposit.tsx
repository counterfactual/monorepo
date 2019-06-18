import { Component, Element, Prop, State, Watch } from "@stencil/core";
import { RouterHistory } from "@stencil/router";
import { Signer } from "ethers";
import { BigNumber } from "ethers/utils";

import AccountTunnel from "../../../data/account";
import AppRegistryTunnel from "../../../data/app-registry";
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

  @Prop() ethWeb3WalletBalance: BigNumber | number = 0;
  @Prop() user: UserSession = {} as UserSession;
  @Prop() updateAccount: (e) => void = e => {};
  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() signer: Signer = {} as Signer;
  @Prop() deposit: (valueInWei: BigNumber) => void = () => {};
  @Prop() canUseApps: Boolean = false;

  @State() error: string = "";
  @State() stage: "ready" | "depositing" | "finished" = "ready";
  @State() amountDeposited;

  componentDidUpdate() {
    if (!this.user || !this.user.id) {
      this.history.push("/");
      return;
    }
  }

  @Watch("canUseApps")
  onDepositFinished() {
    this.stage = "finished";
  }

  get node() {
    return CounterfactualNode.getInstance();
  }

  async formSubmitionHandler(e) {
    this.amountDeposited = window["ethers"].utils.parseEther(e.target.value);

    try {
      this.stage = "depositing";
      await this.deposit(this.amountDeposited);
    } catch (error) {
      this.error = error.message;
      this.stage = "ready";
    }
  }

  render() {
    if (this.stage === "finished") {
      return <stencil-router-redirect url="/" />;
    }

    if (!this.ethWeb3WalletBalance) {
      return <widget-spinner type="dots" />;
    }

    const buttonTexts = {
      ready: "Deposit",
      depositing: "Making deposit..."
    };

    const isFormBusy = this.stage === "depositing";

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
          button={buttonTexts[this.stage]}
          available={window["ethers"].utils.bigNumberify(
            this.ethWeb3WalletBalance
          )}
          min={0.1}
          max={1}
          error={this.error}
          loading={isFormBusy}
          disabled={isFormBusy}
        />
      </widget-screen>
    );
  }
}

AccountTunnel.injectProps(AccountDeposit, ["updateAccount", "user", "deposit"]);
AppRegistryTunnel.injectProps(AccountDeposit, ["canUseApps"]);
WalletTunnel.injectProps(AccountDeposit, ["signer", "ethWeb3WalletBalance"]);
