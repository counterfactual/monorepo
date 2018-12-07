import { Component, Prop } from "@stencil/core";

@Component({
  tag: "widget-screen",
  styleUrl: "widget-screen.scss",
  shadow: true
})
export class WidgetScreen {
  @Prop() exitable: boolean = true;

  render() {
    return (
      <div class="widget-screen">
        <div class="constraint">
          <div class="pre">
            <app-connection />

            {this.exitable ? (
              <stencil-route-link url="/">
                <button class="close" />
              </stencil-route-link>
            ) : null}
          </div>
          <widget-card>
            <div class="logo">
              <app-logo />
            </div>
            <widget-header>
              <slot name="header" />
            </widget-header>
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
