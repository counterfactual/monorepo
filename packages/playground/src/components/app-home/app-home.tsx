import { Component, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import apps from "../../utils/app-list";

const runningApps = {
  // TODO: How do we get a list of available apps?
  "0x822c045f6F5e7E8090eA820E24A5f327C4E62c96": {
    name: "High Roller",
    url: "dapps/high-roller.html",
    icon: "assets/icon/high-roller.svg",
    notifications: 11
  }
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
    return (
      <div class="app-home">
        <apps-list apps={apps} onAppClicked={e => this.appClickedHandler(e)} name="Available Apps" />
        <apps-list apps={runningApps} name="Running Apps" />
      </div>
    );
  }
}
