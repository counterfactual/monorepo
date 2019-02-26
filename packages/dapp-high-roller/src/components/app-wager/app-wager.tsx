import { Component, Element, Prop, State, Watch } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import { Address, AppInstanceID, cf } from "../../data/types";

// FIXME: Figure out how to import @counterfactual-types
// const { AssetType } = commonTypes;

/**
 * User Story
 * 0.1 ETH is staked hard coded
 * The username is retrieved from the Playground
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

  @State() opponent: {
    attributes: {
      username?: string;
      ethAddress?: Address;
      nodeAddress?: string;
    };
  } = { attributes: {} };
  @State() intermediary: string = "";
  @State() isError: boolean = false;
  @State() isWaiting: boolean = false;
  @State() error: any;
  @Prop() account: any;
  @Prop() standalone: boolean = false;

  @Prop() updateAppInstance: (appInstance: {
    id: AppInstanceID;
  }) => void = () => {};
  @Prop() updateOpponent: (opponent: any) => void = () => {};
  @Prop() updateIntermediary: (intermediary: string) => void = () => {};
  @Prop() matchmake: () => Promise<{
    opponent: { attributes: { [key: string]: string } };
    intermediary: string;
  }> = async () => ({ opponent: { attributes: {} }, intermediary: "" });
  @Prop() proposeInstall: (
    betAmount: string,
    checkBalance?: boolean
  ) => Promise<any> = async () => ({});
  @Prop() updateExcludeFromMatchmake: (excluded: string) => void = () => {};

  async componentWillLoad() {
    this.myName = this.account.user.username;

    try {
      return await this.findOpponent();
    } catch {
      this.stopMatchmaking();
    }
  }

  /**
   * Bob(Proposing) clicks the Play! button. He is routed to a waiting room to wait for an opponent
   * @param e
   */
  async handlePlay(e: Event): Promise<void> {
    e.preventDefault();

    try {
      this.isWaiting = true;
      await this.proposeInstall(this.betAmount);
      this.updateExcludeFromMatchmake(this.opponent.attributes
        .ethAddress as string);
    } catch (e) {
      this.isWaiting = true;
      this.error = typeof e === "string" ? e : `${e.message} - ${e.stack}`;
    }
  }

  async findOpponent(): Promise<any> {
    try {
      const result = await this.matchmake();

      this.opponent = result.opponent;
      this.intermediary = result.intermediary;

      this.updateOpponent(this.opponent);
      this.updateIntermediary(this.intermediary);
    } catch (error) {
      this.error = error;
      throw error;
    }
  }

  @Watch("error")
  onErrorSet() {
    this.isError = !!this.error;
  }

  handleChange(e: Event, prop: string): void {
    this[prop] = (e.target as HTMLInputElement).value;
  }

  async rematchmake(e: CustomEvent) {
    const { resetCountDown } = e.detail;
    this.updateExcludeFromMatchmake(this.opponent.attributes
      .ethAddress as string);

    try {
      await this.findOpponent();
    } catch {
      this.stopMatchmaking();
    }

    await this.proposeInstall(this.betAmount, false);

    resetCountDown();
  }

  stopMatchmaking() {
    if (this.error.code === "no_users_available") {
      this.isWaiting = false;
      this.error = "There are no users available to play. Try again later!";
      return;
    }
  }

  render() {
    if (this.isWaiting) {
      return (
        <app-waiting
          myName={this.myName}
          betAmount={this.betAmount}
          opponentName={this.opponent.attributes.username}
          isProposing={true}
          onTimeout={this.rematchmake.bind(this)}
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
              readOnly={true}
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
            {this.isError ? (
              <label class="message__error">
                {this.error instanceof Error
                  ? `${this.error.message}: ${this.error.stack}`
                  : this.error}
              </label>
            ) : (
              {}
            )}
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
  "account",
  "opponent",
  "standalone",
  "matchmake",
  "proposeInstall",
  "updateIntermediary",
  "updateOpponent",
  "updateExcludeFromMatchmake"
]);
