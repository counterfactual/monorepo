declare var ethers;

import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import { AppInstance } from "../../data/mock-app-instance";
import NodeProvider from "../../data/node-provider";
import { cf } from "../../data/types";

interface Player {
  address: string;
  username: string;
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
  @Element() private el: HTMLStencilElement = {} as HTMLStencilElement;

  @Prop() history: RouterHistory = {} as RouterHistory;

  @Prop({ mutable: true }) myName: string = "";
  @Prop({ mutable: true }) betAmount: string = "";
  @Prop({ mutable: true }) opponentName: string = "";
  @Prop({ mutable: true }) shouldMatchmake: boolean = false;
  @State() seconds: number = 5;
  @State() cfjs: any;
  @State() nodeProvider: NodeProvider = new NodeProvider();
  @State() isCountdownStarted: boolean = false;
  @Prop() appFactory: cf.AppFactory = {} as cf.AppFactory;
  @Prop() cfProvider: cf.Provider = {} as cf.Provider;
  @Prop() updateAppInstance = (instance: AppInstance) => {};
  // @Prop() proposeInstall = () => {};

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

  goToGame(opponentName: string, appInstanceId: string) {
    console.log(`GO TO GAME: ${opponentName}`);
    // TODO Fix history.push is broken in v0.2.6+ https://github.com/ionic-team/stencil-router/issues/77
    this.history.push({
      pathname: "/game",
      state: {
        appInstanceId,
        opponentName,
        betAmount: this.betAmount,
        myName: this.myName,
        isProposing: this.shouldMatchmake
      },
      query: {},
      key: ""
    });

    // The INSTALL event should trigger us moving to the game state
  }

  startCountdown() {
    if (this.isCountdownStarted) {
      return;
    }
    this.isCountdownStarted = true;
    this.countDown();
  }

  setupWaiting() {
    if (this.shouldMatchmake) {
      // this.proposeInstall();
      this.setupWaitingProposing();
    } else {
      this.setupWaitingAccepting();
    }
  }

  setupWaitingProposing() {
    if (this.isCountdownStarted) {
      return;
    }

    this.startCountdown();
  }

  setupWaitingAccepting() {
    this.startCountdown();

    // TODO Need to do cfjs.on('updateState', () => {this.goToGame(this.opponentName);}

    setTimeout(() => {
      this.goToGame(this.opponentName, "123");
    }, this.seconds * 1000);
  }

  render() {
    return (
      <CounterfactualTunnel.Consumer>
        {() => [
          <div>{this.setupWaiting()}</div>,
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
CounterfactualTunnel.injectProps(AppWaiting, [
  "appFactory",
  "cfProvider",
  "updateAppInstance",
  "appInstance"
]);
