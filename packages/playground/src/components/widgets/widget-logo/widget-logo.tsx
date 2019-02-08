import { Component, Prop } from "@stencil/core";

@Component({
  tag: "widget-logo",
  styleUrl: "widget-logo.scss",
  shadow: true
})
export class WidgetLogo {
  @Prop() caption: string = "";

  render() {
    return (
      <h1 class="logo">
        <stencil-route-link url="/">
          <img src="/assets/icon/logo.svg" alt="Counterfactual" />
          {!this.caption ? <span>Playground</span> : this.caption}
        </stencil-route-link>
      </h1>
    );
  }
}
