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

  matchmake(/* timeout: number */) {
    const matchMakeMessage: Node.Message = {
      type: Node.MethodName.MATCHMAKE,
      requestId: "123",
      params: ""
    };
    this.nodeProvider.sendMessage(matchMakeMessage);
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

  /**
   * Alice(Accepting) receives a notification that Bob(Proposing) has invited them to play High Roller
   * Alice(Accepting) approves the initiation. Playground calls CF.js install
   * Bob(Proposing) moves out of the waiting room and into the game
   */
  async installAndGoToGame(opponent: Player) {
    // const appFactory = new cf.AppFactory(
    //   // TODO: This probably should be in a configuration, somewhere.
    //   "0x1515151515151515151515151515151515151515",
    //   { actionEncoding: "uint256", stateEncoding: "uint256" },
    //   cfjs
    // );

    // await appFactory.proposeInstall({
    //   // TODO: This should be provided by the Playground.
    //   peerAddress: opponent.address,
    //   asset: {
    //     assetType: 0 /* AssetType.ETH */
    //   },
    //   // TODO: Do we assume the same bet for both parties?
    //   peerDeposit: ethers.utils.parseEther(this.betAmount),
    //   myDeposit: ethers.utils.parseEther(this.betAmount),
    //   // TODO: Check the timeout.
    //   timeout: 100,
    //   initialState: null
    // });
    this.goToGame(opponent.name);
  }

  goToGame(opponentName: string) {
    this.history.push({
      pathname: "/game",
      state: {
        opponentName,
        betAmount: this.betAmount,
        myName: this.myName,
        isProposing: this.shouldMatchmake
      },
      query: {},
      key: ""
    });
  }

  setupCFjs(nodeProvider, cfjs) {
    if (this.cfjs) {
      return;
    }
    this.nodeProvider = nodeProvider;
    this.cfjs = cfjs;
    this.nodeProvider.onMessage(this.onNodeMessage.bind(this));

    if (this.shouldMatchmake) {
      this.countDown();
      this.matchmake();
    } else {
      this.countDown();
      setTimeout(() => {
        this.goToGame(this.opponentName);
      }, this.seconds * 1000);
    }
  }

  onNodeMessage(message /* : Node.Message */) {
    switch (message.type) {
      case Node.MethodName.MATCHMAKE:
        const opponent: Player = {
          address: message.params.peerAddress,
          name: message.params.peerName
        };
        this.installAndGoToGame(opponent);
    }
  }

  render() {
    return (
      <CounterfactualTunnel.Consumer>
        {({ nodeProvider, cfjs }) => [
          <div>{this.setupCFjs(nodeProvider, cfjs)}</div>,
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
