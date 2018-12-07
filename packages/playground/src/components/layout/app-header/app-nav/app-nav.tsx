import { Component, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

@Component({
  tag: "app-nav",
  styleUrl: "app-nav.scss",
  shadow: true
})
export class AppNav {
  // TODO: stop drilling history down to `app-account`
  // waiting for this issue to resolve so we can use `injectHistory`:
  // https://github.com/ionic-team/stencil-router/issues/79
  @Prop() history: RouterHistory = {} as RouterHistory;
  @State() drawerOpened: boolean = false;

  closeDrawerHandler(e) {
    this.drawerOpened = false;
  }

  openDrawerHandler(e) {
    this.drawerOpened = true;
  }

  render() {
    return [
      <app-drawer
        history={this.history}
        opened={this.drawerOpened}
        onCloseDrawer={e => this.closeDrawerHandler(e)}
      />,
      <app-header
        history={this.history}
        onOpenDrawer={e => this.openDrawerHandler(e)}
      />
    ];
  }
}
