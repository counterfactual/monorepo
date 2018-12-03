import { Component, Prop } from "@stencil/core";
import { MatchResults } from "@stencil/router";

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  // TODO Tracking this issue: https://github.com/ionic-team/stencil-router/issues/77
  @Prop() match: MatchResults;

  render() {
    return (
      <div class="height-100">
        <main class="height-100">
          <stencil-router>
            <stencil-route-switch scrollTopOffset={0}>
              <stencil-route url="/" component="app-logo" exact={true} />
              <stencil-route url="/wager" component="app-wager" />
              <stencil-route url="/game" component="app-game" />
            </stencil-route-switch>
          </stencil-router>
        </main>
      </div>
    );
  }
}
