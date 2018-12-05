import { Component, Prop } from "@stencil/core";

@Component({
  tag: "app-connection",
  styleUrl: "app-connection.scss",
  shadow: true
})
export class AppConnection {
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
