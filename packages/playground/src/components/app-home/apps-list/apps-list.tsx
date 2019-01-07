import { Component, Event, EventEmitter, Prop } from "@stencil/core";

import { AppDefinition } from "../../../types";

@Component({
  tag: "apps-list",
  styleUrl: "apps-list.scss",
  shadow: true
})
export class AppsList {
  @Event() appClicked: EventEmitter = {} as EventEmitter;
  @Prop() apps: AppDefinition[] = [];
  @Prop() name: string = "";

  appClickedHandler(event) {
    this.appClicked.emit(event.detail);
  }

  render() {
    return (
      <div class="apps">
        <h2 class="title">{this.name}</h2>

        <ul class="list">
          {this.apps.map(app => (
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
