import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import { AppInstance } from "../../data/mock-app-instance";
import MockNodeProvider from "../../data/mock-node-provider";
import { cf, Node } from "../../data/types";

declare var NodeProvider;
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

  async componentWillLoad() {
    const params = new URLSearchParams(window.location.search);

    // TODO use async/await
    this.nodeProvider = !params.get("standalone")
      ? new NodeProvider()
      : new MockNodeProvider();

    await this.nodeProvider.connect();

    this.setupCfProvider();
    this.waitForCounterpartyAppInstance();
  }

  waitForCounterpartyAppInstance() {
    window.addEventListener("message", event => {
      if (
        typeof event.data === "string" &&
        event.data.startsWith("playground:appInstance")
      ) {
        const [, data] = event.data.split("|");
        console.log("Received counterparty app instance", event.data);

        if (data) {
          const { appInstance } = JSON.parse(data);
          this.updateAppInstance(appInstance);
          this.history.push({
            pathname: "/game"
          });
        }
      }
    });
  }

  setupCfProvider() {
    this.cfProvider = new cf.Provider(this.nodeProvider);

    this.cfProvider.on("updateState", this.onUpdateState.bind(this));
    this.cfProvider.on("install", this.onInstall.bind(this));

    this.appFactory = new cf.AppFactory(
      // TODO: This probably should be in a configuration, somewhere.
      "0x6296F3ACf03b6D787BD1068B4DB8093c54d5d915",
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
