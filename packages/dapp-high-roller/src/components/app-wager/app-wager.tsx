declare var ethers;

import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import { Address, AppInstanceID, cf } from "../../data/types";
import { getProp } from "../../utils/utils";

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
  @Prop() appFactory: cf.AppFactory = {} as cf.AppFactory;
  @State() betAmount: string = "0.01";
  @State() myName: string = "";

  @State() opponent: { username?: string; address?: Address } = {};
  @State() intermediary: string = "";
  @State() isError: boolean = false;
  @State() isWaiting: boolean = false;
  @State() error: any;

  @Prop() updateAppInstance: (
    appInstance: { id: AppInstanceID }
  ) => void = () => {};

  async componentWillLoad() {
    // TODO: figure out how the Playground UI provides Dapps their user data
    this.myName = getProp("myName", this);

    return await this.matchmake();
  }

  /**
   * Bob(Proposing) clicks the Play! button. He is routed to a waiting room to wait for an opponent
   * @param e
   */
  async handlePlay(e: Event): Promise<void> {
    e.preventDefault();

    this.isWaiting = true;

    try {
      await this.appFactory.proposeInstallVirtual({
        peerAddress: this.opponent.address as string,
        asset: {
          assetType: 0 /* AssetType.ETH */
        },
        peerDeposit: ethers.utils.parseEther(this.betAmount),
        myDeposit: ethers.utils.parseEther(this.betAmount),
        timeout: 10000,
        intermediaries: [this.intermediary],
        initialState: null
      });
    } catch (e) {
      debugger;
    }
  }

  async matchmake(/* timeout: number */): Promise<any> {
    // TODO: make an ajax call to the playground server when not in standalone mode

    // TODO: This token should be obtained from LocalStorage.
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ5OGRhZTNmLWNmYjctNGNmNC05OTZiLWZiNDI5NDI3ZGQ4NSIsInVzZXJuYW1lIjoiam9lbCIsImVtYWlsIjoiZXN0dWRpb0Bqb2VsYWxlamFuZHJvLmNvbSIsImFkZHJlc3MiOiIweDBmNjkzY2M5NTZkZjU5ZGVjMjRiYjFjNjA1YWM5NGNhZGNlNjAxNGQiLCJtdWx0aXNpZ0FkZHJlc3MiOiIweDE0NTczMjUzMTkxRDJDMjUxQTg1Y0JBMTQ1NjY0RWUwYUViNDA4NjgiLCJpYXQiOjE1NDcwODU4MTcsImV4cCI6MTU3ODY0MzQxN30.AQ-ataiWl9emPRWtHVinEXYgyHHZquP9DOXLjmcTKJI";

    try {
      const response = await fetch(
        "https://server.playground-staging.counterfactual.com/api/matchmake",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const result = await response.json();

      this.opponent = result.data.opponent;
      this.myName = result.data.user.username;
      this.intermediary = result.data.intermediary;
      this.isError = false;
      this.error = null;
    } catch (error) {
      this.isError = true;
      this.error = error;
    }
  }

  handleChange(e: Event, prop: string): void {
    this[prop] = (e.target as HTMLInputElement).value;
  }

  render() {
    if (this.isError) {
      return (
        <div class="wrapper">
          <div class="wager">
            <div class="message">
              <img
                class="message__icon"
                src="/assets/images/logo.svg"
                alt="High Roller"
              />
              <h1 class="message__title">Oops! :/</h1>
              <p class="message__body">
                Something went wrong:
                <textarea>{JSON.stringify(this.error)}</textarea>
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (this.isWaiting) {
      return (
        <app-waiting
          myName={this.myName}
          betAmount={this.betAmount}
          opponentName={this.opponent.username}
        />
      );
    }

    return (
      <div class="wrapper">
        <div class="wager">
          <div class="message">
            <img
              class="message__icon"
              src="/assets/images/logo.svg"
              alt="High Roller"
            />
            <h1 class="message__title">Welcome!</h1>
            <p class="message__body">Ready to play?</p>
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

CounterfactualTunnel.injectProps(AppWager, ["appFactory", "updateAppInstance"]);
