import { Component, Prop, State } from "@stencil/core";

@Component({
  tag: "dialog-reject-install",
  shadow: true
})
export class DialogRejectInstall {
  @Prop() message: any;
  @Prop() onOKClicked: () => void = () => {};
  @Prop() onReject: () => void = () => {};

  @State() username: string = "";

  componentWillLoad() {
    const lastMatchmake = JSON.parse(
      window.localStorage.getItem("playground:lastMatchmake") ||
        '{"attributes":{"username":"Your opponent"}}'
    );

    this.username = lastMatchmake.data.attributes.username;
  }

  render() {
    return (
      <widget-dialog
        visible={true}
        dialogTitle="Sorry :("
        content={
          <label>
            <strong>{this.username}</strong> has declined your invitation to
            play.
          </label>
        }
        primaryButtonText="OK"
        onPrimaryButtonClicked={() => this.onOKClicked()}
      />
    );
  }
}
