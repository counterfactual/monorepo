// declare var commonTypes;

import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import NodeProvider from "../../data/node-provider";
import { cf, Node } from "../../data/types";

declare var cf: {
  AppFactory: cf.AppFactory;
};

// FIXME: Figure out how to import @counterfactual-types
// const { AssetType } = commonTypes;

/**
 * User Story
 * 0.1 ETH is staked hard coded
 * The username is retrieved from the Playground?
 */

@Component({
  tag: "app-wager",
  styleUrl: "app-wager.scss",
  shadow: true
})
export class AppWager {
  @Element() private el: HTMLStencilElement = {} as HTMLStencilElement;

  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() cfProvider: cf.Provider;
  @Prop() nodeProvider: NodeProvider = {} as NodeProvider;

  @State() betAmount: string = "0.01";
  @State() myName: string = "";

  componentWillLoad() {
    debugger;
    if (this.history.location.query && this.history.location.query.myName) {
      this.myName = this.history.location.query.myName;
    }
  }

  async matchmake(/* timeout: number */) {
    const matchMakeMessage: Node.Message = {
      type: Node.MethodName.MATCHMAKE,
      requestId: "123",
      params: ""
    };

    this.nodeProvider.sendMessage(matchMakeMessage);
  }

  /**
   * Bob(Proposing) clicks the Play! button. He is routed to a waiting room to wait for an opponent
   * @param e
   * @param nodeProvider
   * @param cfjs
   */
  async handlePlay(e: Event): Promise<void> {
    e.preventDefault();

    const appFactory = new cf.AppFactory(
      // TODO: This probably should be in a configuration, somewhere.
      "0x1515151515151515151515151515151515151515",
      { actionEncoding: "uint256", stateEncoding: "uint256" },
      this.cfProvider
    );

    // TODO: This should be triggered.
    this.matchmake();.

    // TODO Fix history.push is broken in v0.2.6+ https://github.com/ionic-team/stencil-router/issues/77
    // TODO: This should be encapsulated as a "onMatchMake()" callback?
    this.history.push({
      pathname: "/waiting",
      state: {
        betAmount: this.betAmount,
        myName: this.myName,
        shouldMatchmake: true
      },
      query: {},
      key: ""
    });
  }

  handleChange(e: Event, prop: string): void {
    this[prop] = (e.target as HTMLInputElement).value;
  }

  render() {
    return (
      <div class="wrapper">
        <div class="wager">
          <div class="message">
            <img
              class="message__icon"
              src="/assets/images/logo.svg"
              alt="High Roller"
            />
            <h1 class="message__title">Lorem ipsum dolor</h1>
            <p class="message__body">
              Phasellus nec sem id felis rutrum iaculis non non lorem.
            </p>
          </div>
          <form class="form" onSubmit={(e: Event) => this.handlePlay(e)}>
            <label htmlFor="myName">Your Name</label>
            <input
              class="form__input"
              id="myName"
              type="text"
              placeholder="Your name"
              value={this.myName}
              onInput={e => this.handleChange(e, "myName")}
            />
            <label htmlFor="betAmount">Bet Amount ( ETH )</label>
            <input
              class="form__input"
              id="betAmount"
              type="number"
              placeholder="3 ETH"
              value={this.betAmount}
              onInput={e => this.handleChange(e, "betAmount")}
              readonly={true}
              step="0.01"
            />
            <button class="form__button">
              <div>Play!</div>
            </button>
          </form>
        </div>
      </div>
    );
  }
}

CounterfactualTunnel.injectProps(AppWager, ["nodeProvider", "cfProvider"]);
