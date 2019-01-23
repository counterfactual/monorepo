import { Component, Prop } from "@stencil/core";

@Component({
  tag: "widget-tooltip",
  styleUrl: "widget-tooltip.scss",
  shadow: true
})
export class WidgetTooltip {
  @Prop() message: string = "";

  render() {
    return (
      <div class="widget-tooltip">
        <slot />
        {this.message ?
          <div class="widget-tooltip-message">
            {this.message}
          </div>
        : undefined}
      </div>
    );
  }
}
