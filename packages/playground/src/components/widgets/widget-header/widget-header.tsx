import { Component } from "@stencil/core";

@Component({
  tag: "widget-header",
  styleUrl: "widget-header.scss",
  shadow: true
})
export class WidgetHeader {
  render() {
    return (
      <h2 class="header">
        <slot />
      </h2>
    );
  }
}
