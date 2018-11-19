// This file is here because for some reason if
// app-home is the only component other than root it doesn't render

import { Component } from "@stencil/core";

@Component({
  tag: "app-profile",
  styleUrl: "app-profile.css",
  shadow: true
})
export class AppProfile {
  render() {
    return <span>This is only here as filler</span>;
  }
}
