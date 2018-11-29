import { Component, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import apps from "../../utils/app-list";

@Component({
  tag: "app-home",
  styleUrl: "app-home.css",
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
        <apps-list apps={apps} onAppClicked={e => this.appClickedHandler(e)} />
      </div>
    );
  }
}
