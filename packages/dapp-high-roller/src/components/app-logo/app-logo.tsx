import { Component } from "@stencil/core";

/**
 * User Story
 * Bob(Proposing) has arrived from the Playground and decided to play High Roller
 * Bob(Proposing) clicks the High Roller logo
 */
@Component({
  tag: "app-logo",
  styleUrl: "app-logo.scss",
  shadow: true
})
export class AppLogo {
  render() {
    return (
      <div>
        <stencil-route-link url="/wager">
          <div class="wrapper wrapper--welcome clickable">
            <h1 class="welcome__logo">
              <img src="/assets/images/logo.svg" alt="High Roller" />
            </h1>
          </div>
          <app-game-coins />
        </stencil-route-link>
      </div>
    );
  }
}
