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
          <app-nav-content />
        </menu>
      </div>
    );
  }
}
