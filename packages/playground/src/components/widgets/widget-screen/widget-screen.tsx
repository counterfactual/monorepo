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
            <app-connection />
            <stencil-route-link url="/">
              <button class="close" />
            </stencil-route-link>
          </div>
          <widget-card>
            <div class="logo">
              <app-logo />
            </div>
            <h2 class="header">
              <slot name="header" />
            </h2>
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
