import { Component, Prop } from "@stencil/core";

import { AppDefinition } from "../../types";

@Component({
  tag: "apps-list",
  styleUrl: "apps-list.css",
  shadow: true
})
export class AppsList {
  @Prop() apps: { [s: string]: AppDefinition } = {};

  public get appsList(): AppDefinition[] {
    return Object.keys(this.apps).map(key => this.apps[key]);
  }

  render() {
    return (
      <ul class="list">
        {this.appsList.map(app => (
          <apps-list-item icon={app.icon} name={app.name} url={app.url} />
        ))}
      </ul>
    );
  }
}
