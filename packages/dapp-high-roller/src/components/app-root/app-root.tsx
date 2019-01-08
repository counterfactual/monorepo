import { Component, Prop } from "@stencil/core";
import { MatchResults, RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import MockNodeProvider from "../../data/node-provider";
import { cf, Node } from "../../data/types";

declare var NodeProvider;
declare var cf;

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  // TODO Tracking this issue: https://github.com/ionic-team/stencil-router/issues/77
  @Prop() match: MatchResults = {} as MatchResults;
  @Prop() history: RouterHistory;
  
  nodeProvider: any;
  cfProvider: cf.Provider = {} as cf.Provider;
  appFactory: cf.AppFactory = {} as cf.AppFactory;

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

    // Using promise syntax because lifecycle events aren't
    // async/await-friendly.
    this.nodeProvider = params.get("standalone")
      ? new MockNodeProvider()
      : new NodeProvider();
    return this.nodeProvider.connect().then(this.setupCfProvider.bind(this));
  }

  setupCfProvider() {
    this.cfProvider = new cf.Provider(this.nodeProvider);

    this.cfProvider.on("updateState", this.onUpdateState.bind(this));
    this.cfProvider.on("install", this.onInstall.bind(this));

    this.appFactory = new cf.AppFactory(
      // TODO: This probably should be in a configuration, somewhere.
      "0x1515151515151515151515151515151515151515",
      { actionEncoding: "uint256", stateEncoding: "uint256" },
      this.cfProvider
    );
  }

  onUpdateState(data: Node.EventData) {
    console.log("UPDATE_STATE", data);
  }

  onInstall(data) {
    console.log("INSTALL", data);
    this.history.push({
      pathname: "/game",
      state: {
        opponentName: "Bob",
        betAmount: "0.1",
        myName: "Alice",
        isProposing: true
      },
      query: {},
      key: ""
    });
  }

  render() {
    const state = {
      appFactory: this.appFactory
    };
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
                <stencil-route
                  url="/accept-invite"
                  component="app-accept-invite"
                />
              </stencil-route-switch>
            </stencil-router>
          </CounterfactualTunnel.Provider>
        </main>
      </div>
    );
  }
}
