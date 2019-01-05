import { Component, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";

/**
 * User Story
 * Bob(Proposing) waits for Alice(Accepting) to install the game
 */

@Component({
  tag: "app-waiting",
  styleUrl: "app-waiting.scss",
  shadow: true
})
export class AppWaiting {
  @Prop() history: RouterHistory;

  @Prop({ mutable: true }) myName: string = "";
  @Prop({ mutable: true }) betAmount: string = "";
  @Prop() opponentName: string = "";

  componentWillLoad() {
    this.myName =
      this.history.location.state && this.history.location.state.myName
        ? this.history.location.state.myName
        : this.history.location.query && this.history.location.query.myName
        ? this.history.location.query.myName
        : this.myName;
    this.betAmount =
      this.history.location.state && this.history.location.state.betAmount
        ? this.history.location.state.betAmount
        : this.history.location.query && this.history.location.query.betAmount
        ? this.history.location.query.betAmount
        : this.betAmount;
  }

  /**
   * Alice(Accepting) receives a notification that Bob(Proposing) has invited them to play High Roller
   * Alice(Accepting) approves the initiation. Playground calls CF.js install
   * Bob(Proposing) moves out of the waiting room and into the game
   */
  async goToGame() {
    this.history.push({
      pathname: "/game",
      state: {
        betAmount: this.betAmount,
        myName: this.myName
      },
      query: {},
      key: ""
    });
  }

  render() {
    return (
      <CounterfactualTunnel.Consumer>
        {({ nodeProvider, cfjs }) => (
          <div class="wrapper">
            <div class="waiting">
              <div class="message">
                <img
                  class="message__icon"
                  src="/assets/images/logo.svg"
                  alt="High Roller"
                />
                <h1 class="message__title">Waiting Room</h1>
                <p class="message__body">
                  Waiting for another player to join the game
                </p>
                <p>
                  Player: {this.myName} <br />
                  Bet Amount: {this.betAmount} ETH
                </p>
              </div>
            </div>
          </div>
        )}
      </CounterfactualTunnel.Consumer>
    );
  }
}
