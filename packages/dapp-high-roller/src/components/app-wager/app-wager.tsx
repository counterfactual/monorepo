import { Component } from "@stencil/core";

@Component({
  tag: "app-wager",
  styleUrl: "app-wager.scss",
  shadow: true
})
export class AppWager {
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
          <form class="form">
            <input class="form__input" type="text" placeholder="Your name" />
            <input class="form__input" type="text" placeholder="3 ETH" />
            <stencil-route-link url="/game" class="form__button">
              <div>Play!</div>
            </stencil-route-link>
          </form>
        </div>
      </div>
    );
  }
}
