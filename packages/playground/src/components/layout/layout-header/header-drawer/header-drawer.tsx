import { Component, Event, EventEmitter, Prop } from "@stencil/core";

@Component({
  tag: "header-drawer",
  styleUrl: "header-drawer.scss",
  shadow: true
})
export class HeaderDrawer {
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
          <header-content />
        </menu>
      </div>
    );
  }
}
