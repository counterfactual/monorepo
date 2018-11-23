import { Component, Prop, State } from "@stencil/core";

import { GameState } from "../../types/enums";

const DARK_PATH = "./assets/images/dice/Dark/Dice-Dark-0";
const LIGHT_PATH = "./assets/images/dice/Light/Dice-Light-0";

@Component({
  tag: "app-game",
  styleUrl: "app-game.scss",
  shadow: true
})
export class AppGame {
  @Prop() myName: string = "Facundo";
  @Prop() opponentName: string = "John";
  @Prop() betAmount: string = "3 ETH";

  @State() gameState: GameState = GameState.Play;
  @State() myRoll: number[] = [1, 1];
  @State() opponentRoll: number[] = [1, 1];
  @State() myScore: number = 0;
  @State() opponentScore: number = 0;

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
    if (totalMyRoll > totalOpponentRoll) {
      console.log("You won :)");
      this.myScore += 1;
      this.gameState = GameState.Won;
    } else if (totalMyRoll < totalOpponentRoll) {
      console.log("You lost :(");
      this.opponentScore += 1;
      this.gameState = GameState.Lost;
    } else {
      console.log("Its a tie :|");
      this.gameState = GameState.Tie;
    }
  }

  render() {
    return (
      <div class="wrapper">
        <div class="game">
          <div class="player">
            <div class="player-info">
              <span class="player-info__name">{this.opponentName}</span>
              <div class="player-info__status">
                <span class="player-info__status__color black" />
                <span class="player-info__status__score">
                  {this.opponentScore}
                </span>
              </div>
            </div>

            <div class="player__dice">
              <img src={`${DARK_PATH}${this.opponentRoll[0]}.svg`} alt="" />
              <img src={`${DARK_PATH}${this.opponentRoll[1]}.svg`} alt="" />
            </div>
          </div>
          <app-game-status
            gameState={this.gameState}
            betAmount={this.betAmount}
          />
          <div class="player">
            <div class="player-info">
              <span class="player-info__name">{this.myName}</span>
              <div class="player-info__status">
                <span class="player-info__status__color" />
                <span class="player-info__status__score">{this.myScore}</span>
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
