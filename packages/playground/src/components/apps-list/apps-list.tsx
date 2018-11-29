import { Component, Event, EventEmitter, Prop } from "@stencil/core";

import { AppDefinition } from "../../types";

@Component({
  tag: "apps-list",
  styleUrl: "apps-list.scss",
  shadow: true
})
export class AppsList {
  @Event() appClicked: EventEmitter = {} as EventEmitter;
  @Prop() apps: { [s: string]: AppDefinition } = {};
  @Prop() name: string = "";

  public get appsList(): AppDefinition[] {
    return Object.keys(this.apps).map(key => this.apps[key]);
  }

  appClickedHandler(event) {
    this.appClicked.emit(event.detail);
  }

  render() {
    return (
      <div class="apps">
        <h2 class="title">{this.name}</h2>

        <ul class="list">
          {this.appsList.map(app => (
            <apps-list-item
              onAppClicked={e => this.appClickedHandler(e)}
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
