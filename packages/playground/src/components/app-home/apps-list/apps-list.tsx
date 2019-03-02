import { Component, Element, Event, EventEmitter, Prop } from "@stencil/core";

import AccountTunnel from "../../../data/account";
import WalletTunnel from "../../../data/wallet";
import { AppDefinition, UserSession } from "../../../types";

@Component({
  tag: "apps-list",
  styleUrl: "apps-list.scss",
  shadow: true
})
export class AppsList {
  @Element() el: HTMLStencilElement = {} as HTMLStencilElement;
  @Event() appClicked: EventEmitter = {} as EventEmitter;
  @Prop() apps: AppDefinition[] = [];
  @Prop() canUseApps: boolean = false;
  @Prop() name: string = "";
  @Prop() user: UserSession = {} as UserSession;
  @Prop() getEtherscanAddressURL: (address: string) => string = () => "";
  @Prop() getEtherscanTxURL: (tx: string) => string = () => "";

  appClickedHandler(event) {
    if (this.canUseApps) {
      this.appClicked.emit(event.detail);
    }
  }

  get spinner() {
    if (!this.canUseApps) {
      const message = this.user.multisigAddress
        ? "Please wait while we collateralize your state channel"
        : "Please wait while we create your state channel";
      const content = (
        <div class="content">
          <label>{message}</label>
          {this.user.multisigAddress ? (
            <a
              target="_blank"
              href={this.getEtherscanAddressURL(this.user.multisigAddress)}
            >
              See the transaction in Etherscan
            </a>
          ) : (
            ""
          )}
        </div>
      );

      return <widget-spinner type="dots" content={content} />;
    }

    return;
  }

  render() {
    return [
      this.spinner,
      <div class={["apps", !this.canUseApps ? "apps--disabled" : ""].join(" ")}>
        <h2 class="title">{this.name}</h2>

        <ul class="list">
          {this.apps.map(app => (
            <apps-list-item
              onAppClicked={e => this.appClickedHandler(e)}
              icon={app.icon}
              canUse={this.canUseApps}
              name={app.name}
              notifications={app.notifications}
              url={app.url}
            />
          ))}
        </ul>
      </div>
    ];
  }
}

WalletTunnel.injectProps(AppsList, [
  "getEtherscanAddressURL",
  "getEtherscanTxURL"
]);
AccountTunnel.injectProps(AppsList, ["user"]);
