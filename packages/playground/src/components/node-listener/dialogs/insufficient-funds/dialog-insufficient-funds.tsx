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
          <main>
            <p>
              You need more ETH in your Playground account to install this game.
            </p>
          </main>
        }
        primaryButtonText="Deposit"
        onPrimaryButtonClicked={() => this.onDeposit()}
        secondaryButtonText="Reject"
        onSecondaryButtonClicked={() => this.onReject()}
      />
    );
  }
}
