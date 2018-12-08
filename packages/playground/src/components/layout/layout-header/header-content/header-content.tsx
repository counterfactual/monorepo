import { Component, Event, EventEmitter, Prop } from "@stencil/core";

@Component({
  tag: "header-content",
  styleUrl: "header-content.scss",
  shadow: true
})
export class HeaderContent {
  @Event() closeDrawer: EventEmitter = {} as EventEmitter;
  @Prop() opened: boolean = false;

  private menuClicked(event: MouseEvent) {
    event.preventDefault();

    this.closeDrawer.emit();
  }

  render() {
    return (
      <nav class="header-content">
        <div class="left">
          <div class="top-line">
            <widget-logo />

            <a class="hide-on-desktop" onClick={e => this.menuClicked(e)}>
              <img src="/assets/icon/menu-btn.svg" alt="Menu" />
            </a>
          </div>
          <div class="connection">
            <widget-connection />
          </div>
        </div>
        <div class="right" />
        <header-account />
      </nav>
    );
  }
}
