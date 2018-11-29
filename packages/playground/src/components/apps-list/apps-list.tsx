import { Component, Prop } from "@stencil/core";

import { AppDefinition } from "../../types";

@Component({
  tag: "apps-list",
  styleUrl: "apps-list.scss",
  shadow: true
})
export class AppsList {
  @Prop() apps: { [s: string]: AppDefinition } = {};
  @Prop() name: string = "";

  public get appsList(): AppDefinition[] {
    return Object.keys(this.apps).map(key => this.apps[key]);
  }

  render() {
    return (
      <div class="apps">
        <h2 class="title">{this.name}</h2>

        <ul class="list">
          {this.appsList.map(app => (
            <apps-list-item
              icon={app.icon}
              name={app.name}
              notifications={app.notifications}
              url={app.url}
            />
          ))}
        </ul>
      </div>
    );
  }
}
