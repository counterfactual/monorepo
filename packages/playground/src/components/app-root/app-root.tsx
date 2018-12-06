import { Component, State } from "@stencil/core";

// @ts-ignore
// Needed due to https://github.com/ionic-team/stencil-router/issues/62
import { MatchResults } from "@stencil/router";

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  render() {
    return (
      <div class="app-root wrapper">
        <main class="wrapper__content">
          <stencil-router>
            <stencil-route-switch scrollTopOffset={0}>
              <stencil-route url="/" component="app-home" exact={true} />
              <stencil-route url="/dapp/:dappName" component="dapp-container" />
              <stencil-route url="/login" component="auth-login" />
              <stencil-route url="/register" component="auth-register" />
            </stencil-route-switch>
          </stencil-router>
        </main>

        <app-footer />
      </div>
    );
  }
}
