import { Component, Event, EventEmitter, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

@Component({
  tag: "app-wager",
  styleUrl: "app-wager.scss",
  shadow: true
})
export class AppWager {
  @Prop() history: RouterHistory;

  @State() betAmount: string = "";
  @State() myName: string = "";

  @Event() depositRequested: EventEmitter = {} as EventEmitter;

  handlePlay(e: Event): void {
    e.preventDefault();
    // TODO Fix history.push is broken in v0.2.6+ https://github.com/ionic-team/stencil-router/issues/77

    this.depositRequested.emit({
      betAmount: this.betAmount,
      name: this.myName,
    });

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
          <form class="form" onSubmit={e => this.handlePlay(e)}>
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
    );
  }
}
