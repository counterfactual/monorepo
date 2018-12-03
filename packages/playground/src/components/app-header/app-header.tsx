import { Component, Event, EventEmitter } from "@stencil/core";

@Component({
  tag: "app-header",
  styleUrl: "app-header.scss",
  shadow: true
})
export class AppHeader {
  @Event() openDrawer: EventEmitter = {} as EventEmitter;

  private menuClicked(event: MouseEvent) {
    event.preventDefault();

    this.openDrawer.emit();
  }

  render() {
    return (
      <header class="header">
        <div class="hide-on-desktop">
          <a onClick={e => this.menuClicked(e)}>
            <img src="/assets/icon/menu-btn.svg" alt="Menu" />
          </a>
        </div>
        <div class="hide-on-mobile">
          <app-nav-content></app-nav-content>
        </div>
      </header>
    );
  }
}
