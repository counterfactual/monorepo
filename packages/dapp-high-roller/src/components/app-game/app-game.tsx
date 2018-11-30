import { Component, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import { GameState, PlayerType } from "../../enums/enums";

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
  handleExit(): void {
    this.history.push({
      pathname: "/wager",
      state: {},
      query: {},
      key: ""
    });
  }

  render() {
    return (
      <div class="wrapper">
        <div class="game">
          <app-game-player
            playerName={this.opponentName}
            playerScore={this.opponentScore}
            playerType={PlayerType.Dark}
            playerRoll={this.opponentRoll}
          />
          <app-game-status
            gameState={this.gameState}
            betAmount={this.betAmount}
          />
          <app-game-player
            playerName={this.myName}
            playerScore={this.myScore}
            playerType={PlayerType.Light}
            playerRoll={this.myRoll}
          />
          {this.gameState === GameState.Play ? (
            <div class="actions">
              <button class="btn btn--center" onClick={() => this.handleRoll()}>
                Roll your dice!
              </button>
            </div>
          ) : (
            <div class="actions">
              <button class="btn btn--exit" onClick={() => this.handleExit()}>
                Exit
              </button>
              <button
                class="btn btn--rematch"
                onClick={() => this.handleRematch()}
              >
                Rematch
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}
