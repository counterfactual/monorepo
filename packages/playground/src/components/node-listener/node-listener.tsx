declare var uuid: () => string;

import { NetworkContext, Node } from "@counterfactual/types";
import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AppRegistryTunnel from "../../data/app-registry";
import CounterfactualNode from "../../data/counterfactual";
import FirebaseDataProvider from "../../data/firebase";
import { AppDefinition } from "../../types";

type NodeMessageHandlerCallback = (data: any) => void;
type NodeMessageResolver = { [key: string]: NodeMessageHandlerCallback };

// TODO: This is a dummy firebase data provider.
// TODO: This configuration should come from the backend.
const serviceProvider = new FirebaseDataProvider({
  apiKey: "AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw",
  authDomain: "foobar-91a31.firebaseapp.com",
  databaseURL: "https://foobar-91a31.firebaseio.com",
  projectId: "foobar-91a31",
  storageBucket: "foobar-91a31.appspot.com",
  messagingSenderId: "432199632441"
});

const messagingService = serviceProvider.createMessagingService("messaging");
const storeService = {
  async get(key: string): Promise<any> {
    return JSON.parse(window.localStorage.getItem(key) as string);
  },
  async set(
    pairs: {
      key: string;
      value: any;
    }[]
  ): Promise<boolean> {
    pairs.forEach(({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value) as string);
    });
    return true;
  }
};

const addressZero = "0x0000000000000000000000000000000000000000";
const networkContext: NetworkContext = {
  AppRegistry: addressZero,
  ETHBalanceRefund: addressZero,
  ETHBucket: addressZero,
  MultiSend: addressZero,
  NonceRegistry: addressZero,
  StateChannelTransaction: addressZero,
  ETHVirtualAppAgreement: addressZero
};

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
  @Prop() history: RouterHistory = {} as RouterHistory;

  private nodeMessageResolver: NodeMessageResolver = {
    proposeInstallVirtualEvent: this.onProposeInstallVirtual.bind(this),
    rejectInstallEvent: this.onRejectInstall.bind(this),
    rejectInstallVirtualEvent: this.onRejectInstall.bind(this),
    installVirtualEvent: this.onInstallVirtual.bind(this)
  };

  get node() {
    return CounterfactualNode.getInstance();
  }

  async componentWillLoad() {
    await CounterfactualNode.create({
      messagingService,
      storeService,
      networkContext,
      nodeConfig: {
        STORE_KEY_PREFIX: "store"
      }
    });

    this.bindNodeEvents();
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

  onInstallVirtual(data) {
    console.log(data);
  }

  async acceptProposeInstall() {
    try {
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
    console.log(
      "Attempting to show modal for ",
      this.currentModalType,
      this.currentMessage
    );
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
      console.log("Rendering reject modal");
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

    console.log("Rendering nothing");
    return [<slot />, modal];
  }
}

AppRegistryTunnel.injectProps(NodeListener, ["apps"]);
