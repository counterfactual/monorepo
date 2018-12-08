import { Component } from "@stencil/core";

@Component({
  tag: "widget-card",
  styleUrl: "widget-card.scss",
  shadow: true
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
