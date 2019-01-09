declare var ethers;

import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import { cf } from "../../data/types";
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

  componentWillLoad() {
    this.myName = getProp("myName", this);
  }

  /**
   * Bob(Proposing) clicks the Play! button. He is routed to a waiting room to wait for an opponent
   * @param e
   */
  async handlePlay(e: Event): Promise<void> {
    e.preventDefault();

    const opponent = await this.matchmake();

    try {
      await this.appFactory.proposeInstallVirtual({
        peerAddress: opponent.address,
        asset: {
          assetType: 0 /* AssetType.ETH */
        },
        peerDeposit: ethers.utils.parseEther(this.betAmount),
        myDeposit: ethers.utils.parseEther(this.betAmount),
        timeout: 10000,
        // TODO: Playground Server address for the current env
        intermediaries: ["0x1234567890playgroundServer1234567890"],
        initialState: null
      });
    } catch (e) {
      debugger;
    }

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

  async matchmake(/* timeout: number */): Promise<any> {
    // TODO: make an ajax call to the playground server

    return new Promise<any>(resolve => {
      resolve({
        username: "Alice",
        address: "0x1234567890abcdefghijklmnop"
      });
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

CounterfactualTunnel.injectProps(AppWager, ["appFactory"]);
