import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import { AppInstance } from "../../data/mock-app-instance";
import MockNodeProvider from "../../data/mock-node-provider";
import { cf, Node } from "../../data/types";

declare var cf;

@Component({
  tag: "app-provider"
})
export class AppProvider {
  @Element() private el: HTMLStencilElement = {} as HTMLStencilElement;

  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() updateAppInstance: (appInstance: AppInstance) => void = () => {};
  @Prop() updateAppFactory: (appFactory: cf.AppFactory) => void = () => {};
  @Prop({ mutable: true })
  nodeProvider: MockNodeProvider = {} as MockNodeProvider;

  @Prop({ mutable: true }) cfProvider: cf.Provider = {} as cf.Provider;
  @Prop({ mutable: true }) appFactory: cf.AppFactory = {} as cf.AppFactory;

  @State() appInstance: AppInstance = {} as AppInstance;

  componentWillLoad() {
    const params = new URLSearchParams(window.location.search);

    // TODO use async/await
    this.nodeProvider = params.get("standalone")
      ? new MockNodeProvider()
      : new cf.NodeProvider();
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

    this.updateAppFactory(this.appFactory);
  }

  onUpdateState(data: Node.EventData) {
    // TODO implement logic
    console.log("UPDATE_STATE", data);
  }

  onInstall(data) {
    this.updateAppInstance(data.data.appInstance);

    this.history.push({
      pathname: "/game",
      state: {
        betAmount: "0.1",
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
