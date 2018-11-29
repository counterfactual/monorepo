import { Component } from "@stencil/core";

import apps from "../../utils/app-list";

@Component({
  tag: "app-home",
  styleUrl: "app-home.css",
  shadow: true
})
export class AppHome {
  render() {
    return (
      <div class="app-home">
        <apps-list apps={apps} />
      </div>
    );
  }
}
