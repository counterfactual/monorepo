import { Component, Prop } from "@stencil/core";
import { MatchResults, RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  // TODO Tracking this issue: https://github.com/ionic-team/stencil-router/issues/77
  @Prop() match: MatchResults;
  @Prop() history: RouterHistory;

  nodeProvider: any;
  cfjs: any;

  componentWillLoad() {
    if (
      this.history &&
      this.history.location &&
      this.history.location.query &&
      this.history.location.query.standalone
    ) {
      // This is supposed to work as per: https://stenciljs.com/docs/router-tutorials#route-query-parameters
      // However this.history seems to always be undefined... Maybe because this is the root?
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("standalone")) {
      return;
    }
    // Using promise syntax because lifecycle events aren't
    // async/await-friendly.
    this.nodeProvider = new NodeProvider();
    return this.nodeProvider.connect().then(() => {
      this.cfjs = new cf.Provider(this.nodeProvider);
    });
  }

  render() {
    const state = { nodeProvider: this.nodeProvider, cfjs: this.cfjs };
    return (
      <div class="height-100">
        <main class="height-100">
          <CounterfactualTunnel.Provider state={state}>
            <stencil-router>
              <stencil-route-switch scrollTopOffset={0}>
                <stencil-route url="/" component="app-logo" exact={true} />
                <stencil-route url="/wager" component="app-wager" />
                <stencil-route url="/game" component="app-game" />
                <stencil-route url="/waiting" component="app-waiting" />
              </stencil-route-switch>
            </stencil-router>
          </CounterfactualTunnel.Provider>
        </main>
      </div>
    );
  }
}
