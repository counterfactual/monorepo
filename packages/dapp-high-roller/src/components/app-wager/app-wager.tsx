import { Component, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";

@Component({
  tag: "app-wager",
  styleUrl: "app-wager.scss",
  shadow: true
})
export class AppWager {
  @Prop() history: RouterHistory;

  @State() betAmount: string = "";
  @State() myName: string = "";

  handlePlay(e: Event, nodeProvider, cfjs): void {
    e.preventDefault();
    // TODO Fix history.push is broken in v0.2.6+ https://github.com/ionic-team/stencil-router/issues/77

    // TODO: Here there be dragons-- I mean, CF.js!
    // const appFactory = new AppFactory(appID, encodings, cfjs);
    // appFactory.proposeInstall();

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
  handleChange(e, prop: string): void {
    // TODO What is the type of e?
    this[prop] = e.target.value;
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
                <input
                  class="form__input"
                  type="text"
                  placeholder="Your name"
                  value={this.myName}
                  onInput={e => this.handleChange(e, "myName")}
                />
                <input
                  class="form__input"
                  type="text"
                  placeholder="3 ETH"
                  value={this.betAmount}
                  onInput={e => this.handleChange(e, "betAmount")}
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
