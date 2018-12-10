import { Component, State } from "@stencil/core";

@Component({
  tag: "layout-header",
  styleUrl: "layout-header.scss",
  shadow: true
})
export class LayoutHeader {
  @State() drawerOpened: boolean = false;

  closeDrawerHandler(e) {
    this.drawerOpened = false;
  }

  openDrawerHandler(e) {
    this.drawerOpened = true;
  }

  render() {
    return [
      <header-drawer
        opened={this.drawerOpened}
        onCloseDrawer={e => this.closeDrawerHandler(e)}
      />,
      <header class="header">
        <div class="hide-on-desktop">
          <a onClick={e => this.openDrawerHandler(e)}>
            <img src="/assets/icon/menu-btn.svg" alt="Menu" />
          </a>
        </div>
        <div class="hide-on-mobile">
          <header-content />
        </div>
      </header>
    ];
  }
}
