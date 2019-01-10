import { Component, Element, Prop, State } from "@stencil/core";

import CounterfactualTunnel from "../../data/counterfactual";
import { AppInstance } from "../../data/mock-app-instance";
import MockNodeProvider from "../../data/mock-node-provider";
import { cf, Node } from "../../data/types";

declare var NodeProvider;
declare var cf;

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  @Prop({ mutable: true }) state: any;
  nodeProvider: any;
  cfProvider: cf.Provider = {} as cf.Provider;
  appFactory: cf.AppFactory = {} as cf.AppFactory;
  @State() appInstance: AppInstance = {} as AppInstance;

  constructor() {
    this.state = {
      appInstance: null,
      appFactory: null,
      updateAppInstance: this.updateAppInstance.bind(this),
      updateAppFactory: this.updateAppFactory.bind(this)
    };
  }

  updateAppInstance(appInstance: AppInstance) {
    this.state = { ...this.state, appInstance };
  }

  updateAppFactory(appFactory: cf.AppFactory) {
    this.state = { ...this.state, appFactory };
  }

  render() {
    return (
      <div class="height-100">
        <main class="height-100">
          <CounterfactualTunnel.Provider state={this.state}>
            <stencil-router>
              <stencil-route-switch scrollTopOffset={0}>
                <stencil-route url="/" component="app-logo" exact={true} />
                <stencil-route
                  url="/"
                  exact={true}
                  component="app-provider"
                  componentProps={{
                    updateAppInstance: this.state.updateAppInstance,
                    updateAppFactory: this.state.updateAppFactory
                  }}
                />
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
