import { Component } from "@stencil/core";

@Component({
  tag: "widget-screen",
  styleUrl: "widget-screen.scss",
  shadow: true
})
export class WidgetScreen {
  render() {
    return (
      <div class="widget-screen">
        <div class="constraint">
          <div class="pre">
            <app-connection></app-connection>
            <stencil-route-link url="/">
              <button class="close"></button>
            </stencil-route-link>
          </div>
          <widget-card>
            <slot />
          </widget-card>
          <div class="post">
            <slot name="post" />
          </div>
        </div>
      </div>
    );
  }
}
