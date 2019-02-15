import { Component, Element, Prop } from "@stencil/core";

import NetworkTunnel from "../../../data/network";

const NETWORK_NAMES = {
  "1": "Mainnet",
  "3": "Ropsten",
  "42": "Kovan",
  "4": "Rinkeby"
};
@Component({
  tag: "widget-connection",
  styleUrl: "widget-connection.scss",
  shadow: true
})
export class WidgetConnection {
  @Element() el!: HTMLStencilElement;
  @Prop() network: string = "";
  @Prop() metamaskUnlocked: boolean = false;

  render() {
    if (!this.network) {
      return (
        <div class="connection">
          <widget-tooltip
            message={
              this.metamaskUnlocked ? "Must be connected to Ropsten" : undefined
            }
          >
            <span class="dot" />
            <span class="status">No connection</span>
          </widget-tooltip>
        </div>
      );
    }

    if (!this.metamaskUnlocked) {
      return (
        <div class="connection">
          <span class="dot locked" />
          <span class="status">Wallet locked</span>
        </div>
      );
    }

    return (
      <div class="connection">
        <span class="dot connected" />
        <span class="status">
          {`Connected to ${NETWORK_NAMES[this.network]}`}
        </span>
      </div>
    );
  }
}

NetworkTunnel.injectProps(WidgetConnection, ["network", "metamaskUnlocked"]);
