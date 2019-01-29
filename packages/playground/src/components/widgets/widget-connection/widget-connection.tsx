import { Component, Element, Prop } from "@stencil/core";

import NetworkTunnel from "../../../data/network";

const NETWORK_NAMES = {
  "1": "Ethereum (Mainnet)",
  "3": "Ropsten (Testnet)",
  "42": "Kovan (Testnet)",
  "4": "Rinkeby (Testnet)"
};
@Component({
  tag: "widget-connection",
  styleUrl: "widget-connection.scss",
  shadow: true
})
export class WidgetConnection {
  @Element() el!: HTMLStencilElement;
  @Prop() network: string = "";

  render() {
    console.log("network", this.network);
    return this.network ? (
      <div class="connection">
        <span class="dot connected" />
        <span class="status">
          `Connected to ${NETWORK_NAMES[this.network]}`
        </span>
      </div>
    ) : (
      <div class="connection">
        <widget-tooltip message="We cannot detect Metamask">
          <span class="dot" />
          <span class="status">No Connection</span>
        </widget-tooltip>
      </div>
    );
  }
}

NetworkTunnel.injectProps(WidgetConnection, ["network"]);
