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
    const params = new URLSearchParams(window.location.search);
    this.state = {
      account: {},
      opponent: {},
      standalone: params.get("standalone") === "true" || false,
      appInstance: null,
      appFactory: null,
      updateAppInstance: this.updateAppInstance.bind(this),
      updateAppFactory: this.updateAppFactory.bind(this),
      updateUser: this.updateAccount.bind(this),
      updateOpponent: this.updateOpponent.bind(this)
    };
  }

  async componentDidLoad() {
    window.addEventListener("message", (event: MessageEvent) => {
      if (
        typeof event.data === "string" &&
        event.data.startsWith("playground:response:user")
      ) {
        const [, data] = event.data.split("|");
        const account = JSON.parse(data);
        this.updateAccount(account);
        console.log(this.state);
      }
    });

    window.parent.postMessage("playground:request:user", "*");
    if (this.state.standalone) {
      const mockAccount = {
        user: {
          address: "0xc60b9023bb8dc153b4046977328ce79af12a77e0",
          email: "alon2@example.com",
          id: "687297bc-8014-4c82-8cee-3b7ca7db09d4",
          username: "MyName"
        },
        multisigAddress: "0x9499ac5A66c36447e535d252c049304D80961CED"
      };
      this.updateAccount(mockAccount);
    }
  }

  updateAccount(account: any) {
    this.state = { ...this.state, account };
  }

  updateOpponent(opponent: any) {
    this.state = { ...this.state, opponent };
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
                <stencil-route
                  url="/wager"
                  component="app-wager"
                  componentProps={{ updateOpponent: this.state.updateOpponent }}
                />
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
