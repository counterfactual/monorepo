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
    return (
      <div class="connection">
        <span class={this.network ? "dot connected" : "dot"} />
        <span class="status">
          {this.network
            ? `Connected to ${NETWORK_NAMES[this.network]}`
            : "No Connection"}
        </span>
      </div>
    );
  }
}

NetworkTunnel.injectProps(WidgetConnection, ["network"]);
