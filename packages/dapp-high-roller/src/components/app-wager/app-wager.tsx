declare var ethers;

import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import { Address, AppInstanceID, cf } from "../../data/types";

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
  @Prop() user: any;

  @Prop() updateAppInstance: (
    appInstance: { id: AppInstanceID }
  ) => void = () => {};

  async componentWillLoad() {
    this.myName = this.user.username;

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
    const { token } = this.user;

    try {
      const response = await fetch(
        // TODO: This URL must come from an environment variable.
        "https://server.playground-stating.counterfactual.com/api/matchmake",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const result = await response.json();

      this.opponent = result.data.opponent;
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

CounterfactualTunnel.injectProps(AppWager, [
  "appFactory",
  "updateAppInstance",
  "user"
]);
