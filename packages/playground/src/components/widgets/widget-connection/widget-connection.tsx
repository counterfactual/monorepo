import { Component, Element, Prop } from "@stencil/core";
import NetworkTunnel from "../../../data/network";

@Component({
  tag: "widget-connection",
  styleUrl: "widget-connection.scss",
  shadow: true
})
export class WidgetConnection {
  @Element() el!: HTMLStencilElement;
  @Prop() network: string = "";

  render() {
    return (
      <div class="connection">
        <span class={this.network ? "dot connected" : "dot"} />
        <span class="status">
          {this.network ? `Connected to ${this.network}` : "No Connection"}
        </span>
      </div>
    );
  }
}

NetworkTunnel.injectProps(WidgetConnection, ["network"]);