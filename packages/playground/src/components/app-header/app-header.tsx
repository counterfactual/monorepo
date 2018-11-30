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
        <div class="left">
          <h1 class="logo">
            <a href="index.html">
              <img src="/assets/icon/logo.svg" alt="Counterfactual" />
              <span>Playground</span>
            </a>
          </h1>
          <app-connection />
        </div>
        <nav class="right" />
      </header>
    );
  }
}
