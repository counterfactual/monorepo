import {
  Component,
  Element,
  Event,
  EventEmitter,
  Prop,
  State
} from "@stencil/core";

import AppRegistryTunnel from "../../../data/app-registry";

@Component({
  tag: "apps-list-item",
  styleUrl: "apps-list-item.scss",
  shadow: true
})
export class AppsListItem {
  @Element() el: HTMLStencilElement = {} as HTMLStencilElement;

  @Event() appClicked: EventEmitter = {} as EventEmitter;
  @Prop() icon: string = "";
  @Prop() name: string = "";
  @Prop() notifications: number | null = null;
  @Prop() url: string = "";
  @Prop() canUseApps: boolean = false;

  @State() modalVisible: boolean = false;

  private getAppSlug() {
    return this.name.toLowerCase().replace(/ /g, "-");
  }

  appClickedHandler(event) {
    event.preventDefault();
    this.appClicked.emit(event);
  }

  showModal() {
    this.modalVisible = true;
  }

  hideModal() {
    this.modalVisible = false;
  }

  private openApp(event: MouseEvent) {
    event.preventDefault();

    if (!this.canUseApps) {
      this.showModal();
      return;
    }

    this.hideModal();

    this.appClicked.emit({
      name: this.name,
      dappContainerUrl: `/dapp/${this.getAppSlug()}`,
      dappUrl: this.url
    });
  }

  render() {
    return (
      <li class="item">
        <a
          href={this.canUseApps ? `/dapp/${this.getAppSlug()}` : "#"}
          onClick={e => this.openApp(e)}
        >
          <div class="icon">
            {this.notifications ? (
              <div class="notification">{this.notifications}</div>
            ) : null}
            <img src={`${this.url}/${this.icon}`} alt={this.name} />
          </div>
          <span class="name">{this.name}</span>
        </a>
        <widget-dialog
          visible={this.modalVisible}
          dialogTitle="One moment, please!"
          content="Your state channel is still collateralizing. Try again in 10-15 seconds."
          primaryButtonText="OK, I'll wait"
          onPrimaryButtonClicked={this.hideModal.bind(this)}
        />
      </li>
    );
  }
}

AppRegistryTunnel.injectProps(AppsListItem, ["canUseApps"]);
