import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AppRegistryTunnel from "../../../data/app-registry";
import NetworkTunnel from "../../../data/network";
import { AppDefinition } from "../../../types";

@Component({
  tag: "app-home",
  styleUrl: "app-home.scss",
  shadow: true
})
export class AppHome {
  @Element() private element: HTMLElement | undefined;

  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() apps: AppDefinition[] = [];
  @Prop() web3Detected: boolean = false;
  @State() runningApps: AppDefinition[] = [];

  appClickedHandler(e) {
    this.history.push(e.detail.dappContainerUrl, e.detail);
  }

  async componentWillLoad() {
    // TODO: This is still mocked.
    this.runningApps = [{ ...this.apps[0], notifications: 11 }];
  }

  render() {
    return (
      <node-listener history={this.history}>
        <layout-header />
        <section class="section fill">
          {this.web3Detected ? (
            <div class="container">
              <apps-list
                apps={this.apps}
                onAppClicked={e => this.appClickedHandler(e)}
                name="Available Apps"
              />
            </div>
          ) : (
            <div class="error-message">
              <h1>404: Wallet Not Found :(</h1>
              <h2>
                This demo has been designed to be used with a Web3-compatible
                wallet such as <a href="https://metamask.io/">Metamask</a> to
                function. Please enable or download one to continue!
              </h2>
            </div>
          )}
          {/* <apps-list apps={this.runningApps} name="Running Apps" /> */}
        </section>
      </node-listener>
    );
  }
}

AppRegistryTunnel.injectProps(AppHome, ["apps"]);

NetworkTunnel.injectProps(AppHome, ["web3Detected"]);
