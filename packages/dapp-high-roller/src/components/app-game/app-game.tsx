import { Component, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import { GameState } from "../../types/enums";

const DARK_PATH = "./assets/images/dice/Dark/Dice-Dark-0";
const LIGHT_PATH = "./assets/images/dice/Light/Dice-Light-0";

@Component({
  tag: "app-game",
  styleUrl: "app-game.scss",
  shadow: true
})
export class AppGame {
  @Prop() history: RouterHistory;

  @Prop({ mutable: true }) myName: string = "Facundo";
  @Prop({ mutable: true }) betAmount: string = "3 ETH";
  @Prop() opponentName: string = "John";

  @State() gameState: GameState = GameState.Play;
  @State() myRoll: number[] = [1, 1];
  @State() myScore: number = 0;

  @State() opponentRoll: number[] = [1, 1];
  @State() opponentScore: number = 0;

  componentWillLoad() {
    this.myName = this.history.location.state.myName
      ? this.history.location.state.myName
      : this.myName;
    this.betAmount = this.history.location.state.betAmount
      ? this.history.location.state.betAmount
      : this.betAmount;
  }

  handleRoll(): void {
    this.myRoll = [
      1 + Math.floor(Math.random() * Math.floor(6)),
      1 + Math.floor(Math.random() * Math.floor(6))
    ];
    this.opponentRoll = [
      1 + Math.floor(Math.random() * Math.floor(6)),
      1 + Math.floor(Math.random() * Math.floor(6))
    ];
    const totalMyRoll = this.myRoll[0] + this.myRoll[1];
    const totalOpponentRoll = this.opponentRoll[0] + this.opponentRoll[1];
    if (totalMyRoll > totalOpponentRoll) {
      this.myScore += 1;
      this.gameState = GameState.Won;
    } else if (totalMyRoll < totalOpponentRoll) {
      this.opponentScore += 1;
      this.gameState = GameState.Lost;
    } else {
      this.gameState = GameState.Tie;
    }
  }
  handleRematch(): void {
    this.gameState = GameState.Play;
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

          {this.gameState === GameState.Play ? (
            <div class="actions">
              <button class="btn btn--center" onClick={() => this.handleRoll()}>
                Roll your dice!
              </button>
            </div>
          ) : (
            <div class="actions">
              <stencil-route-link url="/wager">
                <button class="btn btn--exit">Exit</button>
              </stencil-route-link>
              <button class="btn" onClick={() => this.handleRematch()}>
                Rematch
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}
