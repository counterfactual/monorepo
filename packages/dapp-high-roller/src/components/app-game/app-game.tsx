import { Component, State } from "@stencil/core";

const DARK_PATH = "./assets/images/dice/Dark/Dice-Dark-0";
const LIGHT_PATH = "./assets/images/dice/Light/Dice-Light-0";

@Component({
  tag: "app-game",
  styleUrl: "app-game.scss",
  shadow: true
})
export class AppGame {
  @State() myRoll: number[];
  @State() opponentRoll: number[];

  constructor() {
    this.myRoll = [1, 1];
    this.opponentRoll = [1, 1];
  }
  handleRoll() {
    this.myRoll = [
      1 + Math.floor(Math.random() * Math.floor(6)),
      1 + Math.floor(Math.random() * Math.floor(6))
    ];
    this.opponentRoll = [
      1 + Math.floor(Math.random() * Math.floor(6)),
      1 + Math.floor(Math.random() * Math.floor(6))
    ];
    console.log(
      `Lets roll! Mine: ${this.myRoll} - Opponent: ${this.opponentRoll}`
    );
    const totalMyRoll = this.myRoll[0] + this.myRoll[1];
    const totalOpponentRoll = this.opponentRoll[0] + this.opponentRoll[1];
    const alertText =
      totalMyRoll > totalOpponentRoll
        ? "You won :)"
        : totalMyRoll < totalOpponentRoll
        ? "You lost :("
        : "Its a tie :|";
    console.log(alertText);
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
              <img src={`${DARK_PATH}${this.opponentRoll[0]}.svg`} alt="" />
              <img src={`${DARK_PATH}${this.opponentRoll[1]}.svg`} alt="" />
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
              <img src={`${LIGHT_PATH}${this.myRoll[0]}.svg`} alt="" />
              <img src={`${LIGHT_PATH}${this.myRoll[1]}.svg`} alt="" />
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
