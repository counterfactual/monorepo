import { Component, State } from "@stencil/core";

@Component({
  tag: "app-nav",
  styleUrl: "app-nav.scss",
  shadow: true
})
export class AppNav {
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
        opened={this.drawerOpened}
        onCloseDrawer={e => this.closeDrawerHandler(e)}
      />,
      <app-header onOpenDrawer={e => this.openDrawerHandler(e)} />
    ];
  }
}
