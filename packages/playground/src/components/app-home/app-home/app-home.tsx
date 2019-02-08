import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AppRegistryTunnel from "../../../data/app-registry";
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
  @State() runningApps: AppDefinition[] = [];

  appClickedHandler(e) {
    this.history.push(e.detail.dappContainerUrl, e.detail);
  }

  async componentWillLoad() {
    // TODO: This is still mocked.
    this.runningApps = [{ ...this.apps[0], notifications: 11 }];
  }

  render() {
    return [
      <layout-header />,
      <section class="section">
        <div class="container">
          <apps-list
            apps={this.apps}
            onAppClicked={e => this.appClickedHandler(e)}
            name="Available Apps"
          />
          {/* <apps-list apps={this.runningApps} name="Running Apps" /> */}
        </div>
      </section>
    ];
  }
}

AppRegistryTunnel.injectProps(AppHome, ["apps"]);
