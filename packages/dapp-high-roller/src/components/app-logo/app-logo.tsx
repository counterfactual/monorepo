import { Component } from "@stencil/core";

@Component({
  tag: "app-logo",
  styleUrl: "app-logo.scss"
})
export class AppLogo {
  render() {
    return (
      <div class="">
        <a href="./wager.html" class="wrapper wrapper--welcome clickable">
          <div class="welcome">
            <h1 class="welcome__logo">
              <img src="/assets/images/logo.svg" alt="High Roller" />
            </h1>
          </div>
        </a>
      </div>
    );
  }
}
