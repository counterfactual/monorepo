import { Component, Element, Prop, Watch } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import { AppInstance } from "../../data/mock-app-instance";
import { cf } from "../../data/types";

/**
 * User Story
 * Bob(Proposing) has arrived from the Playground and decided to play High Roller
 * Bob(Proposing) clicks the High Roller logo
 */
@Component({
  tag: "app-logo",
  styleUrl: "app-logo.scss",
  shadow: true
})
export class AppLogo {
  @Element() el: HTMLStencilElement = {} as HTMLStencilElement;

  @Prop() goToWaitingRoom: (history: RouterHistory) => void = () => {};
  @Prop() appInstance: any;
  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() cfProvider: cf.Provider = {} as cf.Provider;
  @Prop() updateAppInstance: (appInstance: AppInstance) => void = () => {};

  @Watch("cfProvider")
  async onCfProviderReady() {
    if (this.appInstance) {
      const appInstance = await this.cfProvider.getOrCreateAppInstance(
        this.appInstance.id,
        this.appInstance
      );
      this.updateAppInstance(appInstance);
      this.goToWaitingRoom(this.history);
    }
  }

  render() {
    return (
      <div>
        <stencil-route-link url="/wager">
          <div class="wrapper wrapper--welcome clickable">
            <h1 class="welcome__logo">
              <img src="/assets/images/logo.svg" alt="High Roller" />
            </h1>
          </div>
        </stencil-route-link>
      </div>
    );
  }
}

CounterfactualTunnel.injectProps(AppLogo, ["cfProvider"]);
