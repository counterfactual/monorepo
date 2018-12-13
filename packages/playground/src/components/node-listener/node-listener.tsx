import { Component } from "@stencil/core";

import CounterfactualNode from "../../data/counterfactual";
import FirebaseDataProvider from "../../data/firebase";
import { WidgetDialogSettings } from "../../types";

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
    const serviceProvider = new FirebaseDataProvider({
      apiKey: "AIzaSyBne_N_gQgaGnyfIPOs9T0PhOPdwRUeUsI",
      authDomain: "joey-firebase-1.firebaseapp.com",
      databaseURL: "https://joey-firebase-1.firebaseio.com",
      projectId: "joey-firebase-1",
      storageBucket: "joey-firebase-1.appspot.com",
      messagingSenderId: "86354058442"
    });

    CounterfactualNode.create({
      privateKey: "MY_FAKE_KEY",
      messagingService: serviceProvider.createMessagingService("messaging"),
      storeService: serviceProvider.createStoreService("storage")
    });
  }

  componentDidLoad() {
    this.bindNodeEvents();
  }

  bindNodeEvents() {
    this.node.on("proposeInstall", this.handleProposeInstall.bind(this));
    this.node.on("rejectInstall", this.handleRejectInstall.bind(this));
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
