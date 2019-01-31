import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import AppRegistryTunnel, {
  AppRegistryState
} from "../../../data/app-registry";
import PlaygroundAPIClient from "../../../data/playground-api-client";
import { AppDefinition } from "../../../types";

@Component({
  tag: "app-home",
  styleUrl: "app-home.scss",
  shadow: true
})
export class AppHome {
  @Element() private element: HTMLElement | undefined;

  @Prop() history: RouterHistory = {} as RouterHistory;

  @State() apps: AppDefinition[] = [];
  @State() runningApps: AppDefinition[] = [];
  @Prop() updateAppRegistry: (data: AppRegistryState) => void = () => {};

  appClickedHandler(e) {
    this.history.push(e.detail.dappContainerUrl, e.detail);
  }

  async componentWillLoad() {
    this.apps = await PlaygroundAPIClient.getApps();

    // TODO: This is still mocked.
    this.runningApps = [{ ...this.apps[0], notifications: 11 }];

    // Save to global state.
    this.updateAppRegistry!({ apps: this.apps });
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

AppRegistryTunnel.injectProps(AppHome, ["updateAppRegistry"]);
