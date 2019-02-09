import { Component, Prop } from "@stencil/core";

@Component({
  tag: "widget-spinner",
  styleUrl: "widget-spinner.scss"
})
export class WidgetSpinner {
  @Prop() visible: boolean = false;

  render() {
    return <div class={`spinner ${!this.visible ? "spinner--hidden" : ""}`} />;
  }
}
