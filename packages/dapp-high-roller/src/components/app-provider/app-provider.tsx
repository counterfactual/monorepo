import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory, injectHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import { AppInstance } from "../../data/mock-app-instance";
import MockNodeProvider from "../../data/node-provider";
import { cf, Node } from "../../data/types";

declare var NodeProvider;
declare var cf;

@Component({
  tag: "app-provider"
})
export class AppProvider {
  @Element() private el: HTMLStencilElement = {} as HTMLStencilElement;
  @Prop() history: RouterHistory;
  @Prop() updateAppInstance: (appInstance: AppInstance) => void;
  @Prop() updateAppFactory: (appFactory: cf.AppFactory) => void;
  @Prop({ mutable: true }) nodeProvider: MockNodeProvider;
  
  @Prop({ mutable: true }) cfProvider: cf.Provider;
  @Prop({ mutable: true }) appFactory: cf.AppFactory;

  @State() appInstance: AppInstance = {} as AppInstance;

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
    console.log('setupCfProvider called');
    this.cfProvider = new cf.Provider(this.nodeProvider);

    this.cfProvider.on("updateState", this.onUpdateState.bind(this));
    this.cfProvider.on("install", this.onInstall.bind(this));

    this.appFactory = new cf.AppFactory(
      // TODO: This probably should be in a configuration, somewhere.
      "0x1515151515151515151515151515151515151515",
      { actionEncoding: "uint256", stateEncoding: "uint256" },
      this.cfProvider
    );

    this.updateAppFactory(this.appFactory);
  }

  onUpdateState(data: Node.EventData) {
    console.log("UPDATE_STATE", data);
  }

  onInstall(data) {
    console.log("INSTALL", data);

    this.updateAppInstance(data.appInstance);

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
    return <div />;
  }
}

injectHistory(AppProvider);
