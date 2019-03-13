import { Component, Element, Event, EventEmitter, Prop } from "@stencil/core";

import AccountTunnel from "../../../data/account";
import AppRegistryTunnel from "../../../data/app-registry";
import { AppDefinition, UserSession } from "../../../types";

@Component({
  tag: "apps-list",
  styleUrl: "apps-list.scss",
  shadow: true
})
export class AppsList {
  @Element() el: HTMLStencilElement = {} as HTMLStencilElement;
  @Event() appClicked: EventEmitter = {} as EventEmitter;
  @Prop() apps: AppDefinition[] = [];
  @Prop() canUseApps: boolean = false;
  @Prop() name: string = "";
  @Prop() user: UserSession = {} as UserSession;

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
              canUse={this.canUseApps}
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

AccountTunnel.injectProps(AppsList, ["user"]);
AppRegistryTunnel.injectProps(AppsList, ["canUseApps"]);
