import {
  Component,
  Event,
  EventEmitter,
  Prop,
  State,
  Watch
} from "@stencil/core";

@Component({
  tag: "header-content",
  styleUrl: "header-content.scss",
  shadow: true
})
export class HeaderContent {
  @Event() closeDrawer: EventEmitter = {} as EventEmitter;
  @Prop() opened: boolean = false;
  @State() connected: boolean = false;

  private menuClicked(event: MouseEvent) {
    event.preventDefault();

    this.closeDrawer.emit();
  }

  private updateConnectionWidget(
    event: CustomEvent<{ authenticated: boolean }>
  ) {
    this.connected = event.detail.authenticated;
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
        <header-account
          onAuthenticationChanged={e => this.updateConnectionWidget(e)}
        />
      </nav>
    );
  }
}
