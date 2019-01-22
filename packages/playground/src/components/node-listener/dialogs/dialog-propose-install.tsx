import { Component, Prop } from "@stencil/core";

@Component({
  tag: "dialog-propose-install",
  shadow: true
})
export class DialogProposeInstall {
  @Prop() message: any;
  @Prop() onAccept: () => void = () => {};
  @Prop() onReject: () => void = () => {};

  render() {
    return (
      <widget-dialog
        visible={true}
        dialogTitle="Game invitation received"
        content={
          <main>
            <h3>{this.message.from} is inviting you to play!</h3>
            <label>
              You'll need to deposit{" "}
              <strong>
                {ethers.utils.formatEther(this.message.data.params.myDeposit)}{" "}
                ETH{" "}
              </strong>
              to play <strong>{this.message.data.params.appId}</strong> with{" "}
              <strong>{this.message.from}</strong>.
            </label>
            <p>Do you wish to proceed?</p>
          </main>
        }
        primaryButtonText="Accept"
        onPrimaryButtonClicked={() => this.onAccept()}
        secondaryButtonText="Reject"
        onSecondaryButtonClicked={() => this.onReject()}
      />
    );
  }
}
