import { Component } from "@stencil/core";

@Component({
  tag: "widget-card",
  styleUrl: "widget-card.scss",
  shadow: false
})
export class WidgetCard {
  render() {
    return (
      <div class="card">
        <slot />
      </div>
    );
  }
}
