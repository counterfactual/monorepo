// declare var commonTypes;
declare var ethers;

import { Component, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";

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
  @Prop() history: RouterHistory;

  @State() betAmount: string = "0.01";
  @State() myName: string = "";

  componentWillLoad() {
    if (this.history.location.query && this.history.location.query.myName) {
      this.myName = this.history.location.query.myName;
    }
  }

  /**
   * Bob(Proposing) clicks the Play! button. He is routed to a waiting room to wait for an opponent
   * @param e
   * @param nodeProvider
   * @param cfjs
   */
  async handlePlay(e: Event, nodeProvider, cfjs): Promise<void> {
    e.preventDefault();

    // TODO Fix history.push is broken in v0.2.6+ https://github.com/ionic-team/stencil-router/issues/77
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
      <CounterfactualTunnel.Consumer>
        {({ nodeProvider, cfjs }) => (
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
              <form
                class="form"
                onSubmit={e => this.handlePlay(e, nodeProvider, cfjs)}
              >
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
        )}
      </CounterfactualTunnel.Consumer>
    );
  }
}
