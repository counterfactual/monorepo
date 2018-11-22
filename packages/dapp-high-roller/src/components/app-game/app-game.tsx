import { Component, State } from "@stencil/core";

@Component({
  tag: "app-game",
  styleUrl: "app-game.scss",
  shadow: true
})
export class AppGame {
  @State() myRoll: number;
  @State() opponentRoll: number;

  constructor() {
    this.myRoll = 1;
    this.opponentRoll = 1;
  }
  handleRoll() {
    this.myRoll = 1 + Math.floor(Math.random() * Math.floor(6));
    this.opponentRoll = 1 + Math.floor(Math.random() * Math.floor(6));
    console.log(
      `Lets roll! Mine: ${this.myRoll} - Opponent: ${this.opponentRoll}`
    );
    const alertText =
      this.myRoll > this.opponentRoll
        ? "You won :)"
        : this.myRoll < this.opponentRoll
        ? "You lost :("
        : "Its a tie :|";
    alert(alertText);
  }

  render() {
    return (
      <div class="wrapper">
        <div class="game">
          <div class="player">
            <div class="player-info">
              <span class="player-info__name">John</span>
              <div class="player-info__status">
                <span class="player-info__status__color black" />
                <span class="player-info__status__score">0</span>
              </div>
            </div>

            <div class="player__dice">
              <img src="./assets/images/dice.svg" alt="" />
              <img src="./assets/images/dice.svg" alt="" />
            </div>
          </div>

          <div class="divider">
            <div class="divider__status divider__status--turn">YOUR TURN</div>
          </div>

          <div class="player">
            <div class="player-info">
              <span class="player-info__name">Facundo</span>
              <div class="player-info__status">
                <span class="player-info__status__color" />
                <span class="player-info__status__score">0</span>
              </div>
            </div>

            <div class="player__dice">
              <img src="./assets/images/dice.svg" alt="" />
              <img src="./assets/images/dice.svg" alt="" />
            </div>
          </div>

          <div class="actions">
            <button class="btn btn--center" onClick={e => this.handleRoll()}>
              Roll your dice!
            </button>
          </div>
        </div>
      </div>
    );
  }
}
