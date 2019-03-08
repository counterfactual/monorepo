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
          <div class="mobile-content">
            <a class="drawer-toggle" onClick={e => this.openDrawerHandler(e)}>
              <img src="/assets/icon/menu-btn.svg" alt="Menu" />
            </a>
            <div class="logo-container">
              <stencil-route-link url="/">
                <img
                  src="/assets/icon/logo.svg"
                  alt="Counterfactual"
                  class="logo"
                />
              </stencil-route-link>
            </div>
            <div class="account-container">
              <header-balance />
            </div>
          </div>
        </div>
        <div class="hide-on-mobile desktop-wrapper">
          <header-content />
        </div>
      </header>
    ];
  }
}
