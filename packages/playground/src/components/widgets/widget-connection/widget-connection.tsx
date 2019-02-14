import { Component, Element, Prop } from "@stencil/core";

import NetworkTunnel from "../../../data/network";

const NETWORK_NAMES = {
  "1": "Ethereum",
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
  @Prop() walletDetected: string = "";

  render() {
    return this.network ? (
      <div class="connection">
        <span class="dot connected" />
        <span class="status">
          {`Connected to ${NETWORK_NAMES[this.network]}`}
        </span>
      </div>
    ) : (
      <div class="connection">
        <widget-tooltip
          message={
            this.walletDetected
              ? "You must be on a supported network, such as Ropsten"
              : "We don't detect a wallet, such as Metamask or Coinbase"
          }
        >
          <span class="dot" />
          <span class="status">No Connection</span>
        </widget-tooltip>
      </div>
    );
  }
}

NetworkTunnel.injectProps(WidgetConnection, ["network", "walletDetected"]);
