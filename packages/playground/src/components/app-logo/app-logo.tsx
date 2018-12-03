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
        <a href="/">
          <img src="/assets/icon/logo.svg" alt="Counterfactual" />
          <span>Playground</span>
        </a>
      </h1>
    );
  }
}
