declare var uuid: () => string;

import { Node } from "@counterfactual/types";
import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";
import { Web3Provider } from "ethers/providers";
import { BigNumber } from "ethers/utils";

import AccountTunnel from "../../data/account";
import AppRegistryTunnel from "../../data/app-registry";
import CounterfactualNode from "../../data/counterfactual";
import WalletTunnel from "../../data/wallet";
import { AppDefinition } from "../../types";

const KOVAN_NETWORK_ID = "42";

type NodeMessageHandlerCallback = (data: any) => void;
type NodeMessageResolver = { [key: string]: NodeMessageHandlerCallback };

@Component({
  tag: "node-listener",
  shadow: true
})
export class NodeListener {
  @Element() el: HTMLStencilElement = {} as HTMLStencilElement;
  @State() private currentMessage: any;
  @State() private currentModalType: any;
  @State() private currentErrorType: any;

  @Prop() apps: AppDefinition[] = [];
  @Prop() web3Detected: boolean = false;
  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() provider: Web3Provider = {} as Web3Provider;
  @Prop() ethMultisigBalance: BigNumber = window["ethers"].constants.Zero;

  private nodeMessageResolver: NodeMessageResolver = {
    proposeInstallVirtualEvent: this.onProposeInstallVirtual.bind(this),
    rejectInstallEvent: this.onRejectInstall.bind(this),
    rejectInstallVirtualEvent: this.onRejectInstall.bind(this)
  };

  get cfProvider() {
    return CounterfactualNode.getCfProvider();
  }

  async componentWillLoad() {
    if (this.web3Detected) {
      this.bindNodeEvents();
    }
  }

  bindNodeEvents() {
    Object.keys(this.nodeMessageResolver).forEach(eventName => {
      this.cfProvider.off(eventName);
      this.cfProvider.on(
        eventName,
        this.nodeMessageResolver[eventName].bind(this)
      );
    });
  }

  onProposeInstallVirtual(data) {
    this.currentMessage = data;
    this.showModal();
  }

  onRejectInstall(data) {
    this.currentMessage = data;
    this.showModal();
  }

  async acceptProposeInstall(message: any) {
    try {
      const proposeInstallParams = message.data
        .params as Node.ProposeInstallParams;

      const currentEthBalance = this.ethMultisigBalance;
      const minimumEthBalance = window["ethers"].utils.bigNumberify(
        proposeInstallParams.initiatorDeposit
      );

      if (currentEthBalance.lt(minimumEthBalance)) {
        this.currentModalType = "error";
        this.currentErrorType = "INSUFFICIENT_FUNDS";
        this.currentMessage = { minimumEthBalance };
        return;
      }

      const { appInstanceId, intermediaries } = this.currentMessage.data;
      const [intermediaryIdentifier] = intermediaries;
      const installedApp = await this.cfProvider.installVirtual(
        appInstanceId,
        intermediaryIdentifier
      );

      const app: AppDefinition = this.apps.find(app => {
        return (
          app.id[KOVAN_NETWORK_ID] === installedApp.appInstance.appDefinition
        );
      })!;

      if (!app) {
        throw new Error(
          "You've received an installation proposal from a different Ethereum network"
        );
      }
      window.localStorage.setItem(
        "playground:installingDapp",
        JSON.stringify({
          installedApp,
          name: app.name,
          dappContainerUrl: `/dapp/${app.slug}`,
          dappUrl: app.url
        })
      );
      this.history.push(`/dapp/${app.slug}`);

      this.hideModal();
    } catch (error) {
      this.currentModalType = "error";
      this.currentErrorType = error.message;
      console.error(error);
    }
  }

  async rejectProposeInstall() {
    await this.cfProvider.rejectInstall(this.currentMessage.data.appInstanceId);
    this.hideModal();
  }

  showModal() {
    this.currentModalType = this.currentMessage.type;
  }

  hideModal() {
    this.currentModalType = "none";
  }

  render() {
    let modal: JSX.Element = {};

    if (this.currentModalType === "proposeInstallVirtualEvent") {
      modal = (
        <dialog-propose-install
          message={this.currentMessage}
          onAccept={this.acceptProposeInstall.bind(this)}
          onReject={this.rejectProposeInstall.bind(this)}
        />
      );
    }

    if (
      this.currentModalType === "rejectInstallVirtualEvent" ||
      this.currentModalType === "rejectInstallEvent"
    ) {
      modal = (
        <dialog-reject-install
          message={this.currentMessage}
          onOKClicked={this.hideModal.bind(this)}
        />
      );
    }

    if (this.currentModalType === "error") {
      if (this.currentErrorType === "INSUFFICIENT_FUNDS") {
        modal = (
          <dialog-insufficient-funds
            message={this.currentMessage}
            onDeposit={this.hideModal.bind(this)}
            onReject={this.rejectProposeInstall.bind(this)}
          />
        );
      } else {
        modal = (
          <widget-dialog
            dialogTitle="Something went wrong"
            content={`${this.currentErrorType}. See the console for more info.`}
            primaryButtonText="OK"
            onPrimaryButtonClicked={() => this.hideModal()}
          />
        );
      }
    }

    return [<slot />, modal];
  }
}

AppRegistryTunnel.injectProps(NodeListener, ["apps"]);
AccountTunnel.injectProps(NodeListener, ["ethMultisigBalance"]);
WalletTunnel.injectProps(NodeListener, ["web3Detected", "provider"]);
