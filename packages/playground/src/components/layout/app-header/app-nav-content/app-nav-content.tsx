import { Component, Event, EventEmitter, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

@Component({
  tag: "app-nav-content",
  styleUrl: "app-nav-content.scss",
  shadow: true
})
export class AppNavContent {
  @Event() closeDrawer: EventEmitter = {} as EventEmitter;
  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() opened: boolean = false;

  private menuClicked(event: MouseEvent) {
    event.preventDefault();

    this.closeDrawer.emit();
  }

  render() {
    return (
      <nav class="app-nav-content">
        <div class="left">
          <div class="top-line">
            <app-logo />

            <a class="hide-on-desktop" onClick={e => this.menuClicked(e)}>
              <img src="/assets/icon/menu-btn.svg" alt="Menu" />
            </a>
          </div>
          <div class="connection">
            <app-connection />
          </div>
        </div>
        <div class="right" />
        <app-account history={this.history} />
      </nav>
    );
  }
}
