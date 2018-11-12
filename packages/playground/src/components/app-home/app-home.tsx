import { Component } from "@stencil/core";

@Component({
  tag: "app-home",
  styleUrl: "app-home.css",
  shadow: true
})
export class AppHome {
  render() {
    // tslint:disable-next-line:prettier
    return (
      <div class="app-home">
        <span>Soon, we'll have some dApps for you!</span>
      </div>
    );
  }
}
