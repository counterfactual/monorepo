import { Component } from "@stencil/core";

import CounterfactualNode from "../../data/counterfactual";
import FirebaseDataProvider from "../../data/firebase";
import { WidgetDialogSettings } from "../../types";

type NodeMessageHandlerCallback = (data: any) => void;
type NodeMessageResolver = { [key: string]: NodeMessageHandlerCallback };

@Component({
  tag: "node-listener",
  shadow: true
})
export class NodeListener {
  private currentMessage: string = "";

  private modals: { [key: string]: (data: any) => WidgetDialogSettings } = {
    proposeInstall: data => ({
      content: (
        <label>
          You're about to deposit <strong>${data.eth}</strong>
          to play <strong>${data.appName}</strong>
          with <strong>${data.peerName}</strong>
        </label>
      ),
      primaryButtonText: "Accept",
      secondaryButtonText: "Reject",
      onPrimaryButtonClicked: this.acceptProposeInstall.bind(this, data),
      onSecondaryButtonClicked: this.rejectProposeInstall.bind(this, data)
    })
  };

  private nodeMessageResolver: NodeMessageResolver = {
    proposeInstall: this.handleProposeInstall.bind(this),
    rejectInstall: this.handleRejectInstall.bind(this)
  };

  private modalVisible: boolean = false;
  private modalData: WidgetDialogSettings = {} as WidgetDialogSettings;

  get node() {
    return CounterfactualNode.getInstance();
  }

  private get currentModalConfiguration():
    | ((data: any) => WidgetDialogSettings)
    | null {
    if (this.currentMessage) {
      return this.modals[this.currentMessage];
    }

    return null;
  }

  componentWillLoad() {
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

    const privateKey =
      "0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257a";
    const messagingService = serviceProvider.createMessagingService(
      "messaging"
    );
    const storeService = serviceProvider.createStoreService("storage");

    CounterfactualNode.create({
      privateKey,
      messagingService,
      storeService,
      nodeConfig: {
        MULTISIG_KEY_PREFIX: "multisig"
      }
    });
  }

  componentDidLoad() {
    this.bindNodeEvents();
  }

  bindNodeEvents() {
    Object.keys(this.nodeMessageResolver).forEach(methodName => {
      this.node.on(methodName, this.nodeMessageResolver[methodName].bind(this));
    });
  }

  handleProposeInstall(data) {
    this.showModal(data);
  }

  acceptProposeInstall(data) {}

  rejectProposeInstall(data) {}

  handleRejectInstall(data) {}

  showModal(data) {
    if (!this.modals[this.currentMessage]) {
      return;
    }

    this.currentMessage = data.type;
    this.modalVisible = true;
    this.modalData = this.currentModalConfiguration!(data);
  }

  hideModal() {
    this.modalVisible = false;
  }

  render() {
    return (
      <widget-dialog
        visible={this.modalVisible}
        icon={this.modalData.icon}
        title={this.modalData.title}
        content={this.modalData.content}
        primaryButtonText={this.modalData.primaryButtonText}
        secondaryButtonText={this.modalData.secondaryButtonText}
        onPrimaryButtonClicked={this.modalData.onPrimaryButtonClicked}
        onSecondaryButtonClicked={this.modalData.onSecondaryButtonClicked}
      />
    );
  }
}
