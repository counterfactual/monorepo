import { Component, Prop } from "@stencil/core";

@Component({
  tag: "dialog-reject-install",
  shadow: true
})
export class DialogRejectInstall {
  @Prop() message: any;
  @Prop() onOKClicked: () => void = () => {};
  @Prop() onReject: () => void = () => {};

  render() {
    return (
      <widget-dialog
        visible={true}
        dialogTitle="Game invite rejected :("
        content={
          <main>
            <p>Your counterparty doesn't want to play.</p>
          </main>
        }
        primaryButtonText="OK"
        onPrimaryButtonClicked={() => this.onOKClicked()}
      />
    );
  }
}
