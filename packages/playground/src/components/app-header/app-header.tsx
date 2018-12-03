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
        <div class="mobile">
          <a onClick={e => this.menuClicked(e)}>
            <img src="/assets/icon/menu-btn.svg" alt="Menu" />
          </a>
        </div>
        <div class="desktop">
          <div class="left">
            <app-logo />
            <app-connection />
          </div>
          <nav class="right" />
        </div>
      </header>
    );
  }
}
