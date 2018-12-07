import { Component } from "@stencil/core";

@Component({
  tag: "app-logo",
  styleUrl: "app-logo.scss",
  shadow: true
})
export class AppLogo {
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
