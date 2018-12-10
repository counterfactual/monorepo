import { Component, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import apps from "../../../utils/app-list";

const runningAppKey = Object.keys(apps)[0];
const runningApps = {
  [runningAppKey]: Object.assign(
    {
      notifications: 11
    },
    apps[runningAppKey]
  )
};

@Component({
  tag: "app-home",
  styleUrl: "app-home.scss",
  shadow: true
})
export class AppHome {
  @Prop() history: RouterHistory = {} as RouterHistory;

  appClickedHandler(e) {
    this.history.push(e.detail.dappContainerUrl, e.detail);
  }

  render() {
    return [
      <layout-header />,
      <section class="section">
        <div class="container">
          <apps-list
            apps={apps}
            onAppClicked={e => this.appClickedHandler(e)}
            name="Available Apps"
          />
          <apps-list apps={runningApps} name="Running Apps" />
        </div>
      </section>
    ];
  }
}
