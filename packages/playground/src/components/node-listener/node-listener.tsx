import { Component } from "@stencil/core";

import CounterfactualNode from "../../data/counterfactual";
import { AppDialogSettings } from "../../types";

@Component({
  tag: "node-listener",
  shadow: true
})
export class NodeListener {
  private currentMessage: string = "";

  private modals: { [key: string]: (data: any) => AppDialogSettings } = {
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
  private modalData: AppDialogSettings = {} as AppDialogSettings;

  get node() {
    return CounterfactualNode.getInstance();
  }

  private get currentModalConfiguration():
    | ((data: any) => AppDialogSettings)
    | null {
    if (this.currentMessage) {
      return this.modals[this.currentMessage];
    }

    return null;
  }

  componentWillLoad() {
    CounterfactualNode.create({
      privateKey: "MY_FAKE_KEY",
      messagingService: {
        send() {},
        receive() {}
      },
      storeService: {
        get() {},
        set() {}
      }
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
      <app-dialog
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
