import { Component } from "@stencil/core";

@Component({
  tag: "app-connection",
  styleUrl: "app-connection.scss",
  shadow: true
})
export class AppConnection {
  render() {
    return (
      <div class="connection">
        <span class="dot" />
        <span class="status">No Connection</span>
      </div>
    );
  }
}
