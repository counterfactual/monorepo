import { Component } from "@stencil/core";

@Component({
  tag: "app-home",
  styleUrl: "app-home.css",
  shadow: true
})
export class AppHome {
  render() {
    return (
      <div class="app-home">
        <p>Lets get rolling!</p>
      </div>
    );
  }
}
