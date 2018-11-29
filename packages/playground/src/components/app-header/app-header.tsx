import { Component } from "@stencil/core";

@Component({
  tag: "app-header",
  styleUrl: "app-header.scss",
  shadow: true
})
export class AppHeader {
  render() {
    return (
      <header class="header">
        <a href="index.html">
          <h1 class="left">
            <img src="./assets/icon/logo.svg" alt="Counterfactual" />
            <span>Playground</span>
          </h1>
        </a>
        <nav class="right" />
      </header>
    );
  }
}
