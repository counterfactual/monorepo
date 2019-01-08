import { Component, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import NodeProvider from "../../data/node-provider";
import { Node } from "../../data/types";

interface Player {
  address: string;
  name: string;
}

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
  @Prop({ mutable: true }) opponentName: string = "";
  @Prop({ mutable: true }) shouldMatchmake: boolean = false;
  @State() seconds: number = 5;
  @State() cfjs: any;
  @State() nodeProvider: NodeProvider = new NodeProvider();
  @State() isCountdownStarted: boolean = false;

  /**
   * Bob(Proposing) enters waiting room.
   * Bob(Proposing) makes a call to Playground for matchmaking and waits to get an Accepting player.
   * Bob(Proposing) makes a call to CF.js proposeInstall.
   * Bob(Proposing) waits for Alice(Accepting) to approve -- Add Waiting Room (Waiting for Alice) --
   */
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
    this.opponentName =
      this.history.location.state && this.history.location.state.opponentName
        ? this.history.location.state.opponentName
        : this.history.location.query &&
          this.history.location.query.opponentName
        ? this.history.location.query.opponentName
        : this.opponentName;
    this.shouldMatchmake =
      this.history.location.state && this.history.location.state.shouldMatchmake
        ? this.history.location.state.shouldMatchmake
        : this.history.location.query &&
          this.history.location.query.shouldMatchmake
        ? this.history.location.query.shouldMatchmake
        : this.shouldMatchmake;
  }

  countDown() {
    if (this.seconds === 1) {
      return;
    }
    setTimeout(() => {
      this.seconds = this.seconds - 1;
      this.countDown();
    }, 1000);
  }

  goToGame(opponentName: string) {
    // The INSTALL event should trigger us moving to the game state
  }

  startCountdown() {
    if (this.isCountdownStarted) {
      return;
    }
    this.isCountdownStarted = true;
    this.countDown();
    setTimeout(() => {
      this.goToGame(this.opponentName);
    }, this.seconds * 1000);
  }

  render() {
    return (
      <CounterfactualTunnel.Consumer>
        {() => [
          <div>{this.startCountdown()}</div>,
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
                  Waiting for another player to join the game in
                </p>
                <p class="countdown">{this.seconds}</p>
                <p>
                  Player: {this.myName} <br />
                  Bet Amount: {this.betAmount} ETH
                </p>
              </div>
            </div>
          </div>
        ]}
      </CounterfactualTunnel.Consumer>
    );
  }
}
