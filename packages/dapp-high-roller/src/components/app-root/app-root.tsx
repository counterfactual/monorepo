import { Component, Prop } from "@stencil/core";
import { MatchResults } from "@stencil/router";

import { Provider } from "@counterfactual/cf.js";
import * as NodeProvider from "@counterfactual/node-provider";

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  // TODO Tracking this issue: https://github.com/ionic-team/stencil-router/issues/77
  @Prop() match: MatchResults;

  componentDidLoad() {
    debugger;
    const nodeProvider = new NodeProvider.NodeProvider();
    (async () => {
      await nodeProvider.connect();
      const client = new Provider(nodeProvider);
    })();
  }

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
