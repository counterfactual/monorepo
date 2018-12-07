import { Component, Prop } from "@stencil/core";

@Component({
  tag: "widget-connection",
  styleUrl: "widget-connection.scss",
  shadow: true
})
export class WidgetConnection {
  @Prop() connected: boolean = false;

  render() {
    return (
      <div class="connection">
        <span class={this.connected ? "dot connected" : "dot"} />
        <span class="status">
          {this.connected ? "Connected" : "No Connection"}
        </span>
      </div>
    );
  }
}
