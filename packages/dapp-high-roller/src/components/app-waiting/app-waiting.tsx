import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import { getProp } from "../../utils/utils";

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

  @Prop() cfProvider: any;
  @Prop() opponent: any;
  @Prop() account: any;
  @Prop() appInstance: any;

  @Prop({ mutable: true }) myName: string = "";
  @Prop({ mutable: true }) betAmount: string = "";
  @Prop({ mutable: true }) opponentName: string = "";
  @Prop({ mutable: true }) isProposing: boolean = false;
  @State() seconds: number = 5;
  @State() isCountdownStarted: boolean = false;

  componentWillLoad() {
    this.betAmount = getProp("betAmount", this);
    this.isProposing = getProp("isProposing", this);
  }

  componentDidLoad() {
    this.setupWaiting();
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
        isProposing: this.isProposing
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

  setupWaiting(cfProvider?, appInstance?, account?, opponent?) {
    if (this.isProposing) {
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
    this.cfProvider.once("updateState", () => {
      this.goToGame(this.opponentName, this.appInstance.id);
    });
    this.myName = this.account.user.username;
    this.opponentName = this.opponent.attributes.username;
  }

  render() {
    return (
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
              {this.isProposing
                ? "Waiting for another player to join the game in"
                : `Waiting on ${this.opponentName}'s roll...`}
            </p>
            {this.isProposing ? <p class="countdown">{this.seconds}</p> : {}}
            <p>
              Player: {this.myName} <br />
              Opponent: {this.opponentName} <br />
              Bet Amount: {this.betAmount} ETH
            </p>
          </div>
        </div>
      </div>
    );
  }
}

CounterfactualTunnel.injectProps(AppWaiting, [
  "cfProvider",
  "appInstance",
  "account",
  "opponent"
]);
