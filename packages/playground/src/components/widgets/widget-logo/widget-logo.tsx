import { Component } from "@stencil/core";

@Component({
  tag: "widget-logo",
  styleUrl: "widget-logo.scss",
  shadow: true
})
export class WidgetLogo {
  render() {
    return (
      <h1 class="logo">
        <stencil-route-link url="/">
          <img src="/assets/icon/logo.svg" alt="Counterfactual" />
          <span>Playground</span>
        </stencil-route-link>
      </h1>
    );
  }
}