import { Component, Prop } from "@stencil/core";

@Component({
  tag: "widget-spinner",
  styleUrl: "widget-spinner.scss"
})
export class WidgetSpinner {
  @Prop() visible: boolean = false;
  @Prop() type: "circle" | "dots" = "circle";
  @Prop() content: JSX.Element = {} as JSX.Element;

  render() {
    if (this.type === "circle") {
      return (
        <div
          class={`spinner spinner--circle ${
            !this.visible ? "spinner--hidden" : ""
          }`}
        />
      );
    }

    if (this.type === "dots") {
      return (
        <div
          class={`spinner spinner--loading ${
            !this.visible ? "spinner--hidden" : ""
          }`}
        >
          <div class="spinner-loading">
            <div class="bounce1" />
            <div class="bounce2" />
            <div class="bounce3" />
          </div>
          {this.content}
        </div>
      );
    }

    return;
  }
}
