declare var uuid: () => string;

import { Node } from "@counterfactual/types";
import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AccountTunnel from "../../data/account";
import AppRegistryTunnel from "../../data/app-registry";
import CounterfactualNode from "../../data/counterfactual";
import WalletTunnel, { WalletState } from "../../data/wallet";
import { AppDefinition } from "../../types";

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
  @Prop() balance: any;

  private nodeMessageResolver: NodeMessageResolver = {
    proposeInstallVirtualEvent: this.onProposeInstallVirtual.bind(this),
    rejectInstallEvent: this.onRejectInstall.bind(this),
    rejectInstallVirtualEvent: this.onRejectInstall.bind(this)
  };

  get node() {
    return CounterfactualNode.getInstance();
  }

  async componentWillLoad() {
    if (this.web3Detected) {
      this.bindNodeEvents();
    }
  }

  bindNodeEvents() {
    Object.keys(this.nodeMessageResolver).forEach(eventName => {
      this.node.off(eventName);
      this.node.on(eventName, this.nodeMessageResolver[eventName].bind(this));
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

      const currentEthBalance = ethers.utils.bigNumberify(this.balance);
      const minimumEthBalance = proposeInstallParams.myDeposit.add(
        await this.provider.estimateGas({
          to: message.data.proposedByIdentifier,
          value: proposeInstallParams.myDeposit
        })
      );

      if (currentEthBalance.lt(minimumEthBalance)) {
        this.currentModalType = "error";
        this.currentErrorType = "INSUFFICIENT_FUNDS";
        this.currentMessage = { minimumEthBalance };
        return;
      }

      const request = {
        type: Node.MethodName.INSTALL_VIRTUAL,
        params: {
          appInstanceId: this.currentMessage.data.appInstanceId,
          intermediaries: this.currentMessage.data.params.intermediaries
        } as Node.InstallVirtualParams,
        requestId: uuid()
      };

      const installedApp = (await this.node.call(
        Node.MethodName.INSTALL_VIRTUAL,
        request
      )).result as Node.InstallVirtualResult;

      const app = this.apps.find(
        app => app.id === installedApp.appInstance.appId
      ) as AppDefinition;

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
    await this.node.call(Node.MethodName.REJECT_INSTALL, {
      type: Node.MethodName.REJECT_INSTALL,
      params: {
        appInstanceId: this.currentMessage.data.appInstanceId
      } as Node.RejectInstallParams,
      requestId: uuid()
    });
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
AccountTunnel.injectProps(NodeListener, ["balance", "provider"]);
WalletTunnel.injectProps(NodeListener, ["web3Detected"]);
