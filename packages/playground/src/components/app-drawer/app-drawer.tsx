import { Component, Event, EventEmitter, Prop } from "@stencil/core";

@Component({
  tag: "app-drawer",
  styleUrl: "app-drawer.scss",
  shadow: true
})
export class AppDrawer {
  @Event() closeDrawer: EventEmitter = {} as EventEmitter;
  @Prop() opened: boolean = false;

  private menuClicked(event: MouseEvent) {
    event.preventDefault();

    this.closeDrawer.emit();
  }

  render() {
    return (
      <div class={this.opened ? "drawer-container opened" : "drawer-container"}>
        <a onClick={e => this.menuClicked(e)} class="drawer-screen" />
        <menu class="drawer">
          <div class="top-line">
            <app-logo />

            <a onClick={e => this.menuClicked(e)}>
              <img src="/assets/icon/menu-btn.svg" alt="Menu" />
            </a>
          </div>
          <app-connection />
        </menu>
      </div>
    );
  }
}
