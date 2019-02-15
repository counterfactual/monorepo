import { Component, Prop } from "@stencil/core";

@Component({
  tag: "dialog-insufficient-funds",
  shadow: true
})
export class DialogInsufficientFunds {
  @Prop() message: any;
  @Prop() onDeposit: () => void = () => {};
  @Prop() onReject: () => void = () => {};

  render() {
    return (
      <widget-dialog
        visible={true}
        dialogTitle="Insufficient funds"
        content={
          <label>
            You need at least{" "}
            {ethers.utils.formatEther(this.message.minimumEthBalance)} ETH to
            ETH in your Playground account to install this game.
          </label>
        }
        primaryButtonText="Deposit"
        onPrimaryButtonClicked={() => this.onDeposit()}
        secondaryButtonText="Reject"
        onSecondaryButtonClicked={() => this.onReject()}
      />
    );
  }
}
