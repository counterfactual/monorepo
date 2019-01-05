// declare var commonTypes;
declare var ethers;

import { Component, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";

// FIXME: Figure out how to import @counterfactual-types
// const { AssetType } = commonTypes;

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
    if (
      this.history &&
      this.history.location &&
      this.history.location.query &&
      this.history.location.query.myName
    ) {
      this.myName = this.history.location.query.myName;
    }
  }

  async handlePlay(e: Event, nodeProvider, cfjs): Promise<void> {
    e.preventDefault();

    const appFactory = new cf.AppFactory(
      // TODO: This probably should be in a configuration, somewhere.
      "0x1515151515151515151515151515151515151515",
      { actionEncoding: "uint256", stateEncoding: "uint256" },
      cfjs
    );

    await appFactory.proposeInstall({
      // TODO: This should be provided by the Playground.
      peerAddress: "0x0101010101010101010101010101010101010101",
      asset: {
        assetType: 0 /* AssetType.ETH */
      },
      // TODO: Do we assume the same bet for both parties?
      peerDeposit: ethers.utils.parseEther(this.betAmount),
      myDeposit: ethers.utils.parseEther(this.betAmount),
      // TODO: Check the timeout.
      timeout: 100,
      initialState: null
    });

    // TODO Fix history.push is broken in v0.2.6+ https://github.com/ionic-team/stencil-router/issues/77
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
