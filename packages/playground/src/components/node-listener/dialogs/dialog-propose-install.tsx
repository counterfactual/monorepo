import { Component, Element, Prop } from "@stencil/core";

import AppRegistryTunnel from "../../../data/app-registry";
import { AppDefinition } from "../../../types";

@Component({
  tag: "dialog-propose-install",
  shadow: true
})
export class DialogProposeInstall {
  @Element() el: HTMLStencilElement = {} as HTMLStencilElement;
  @Prop() message: any;
  @Prop() onAccept: () => void = () => {};
  @Prop() onReject: () => void = () => {};
  @Prop() apps: AppDefinition[] = [];

  render() {
    return (
      <widget-dialog
        visible={true}
        dialogTitle="You've been invited to play!"
        content={
          <label>
            You'll need to deposit
            <br />
            <strong>
              {ethers.utils.formatEther(this.message.data.params.myDeposit)} ETH
            </strong>{" "}
            to play{" "}
            <strong>
              {
                this.apps.find(
                  app => app.id === this.message.data.params.appId
                )!.name
              }
            </strong>{" "}
            with <strong>{this.message.from.substr(0, 6)}</strong>.
          </label>
        }
        primaryButtonText="Accept"
        onPrimaryButtonClicked={() => this.onAccept()}
        secondaryButtonText="Reject"
        onSecondaryButtonClicked={() => this.onReject()}
      />
    );
  }
}

AppRegistryTunnel.injectProps(DialogProposeInstall, ["apps"]);
