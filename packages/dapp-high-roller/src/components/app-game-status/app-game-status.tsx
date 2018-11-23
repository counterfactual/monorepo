import { Component, Prop } from "@stencil/core";

import { GameState } from "../../types/enums";

@Component({
  tag: "app-game-status",
  styleUrl: "app-game-status.scss",
  shadow: true
})
export class AppGameStatus {
  @Prop() gameState: GameState = GameState.Play;
  @Prop() betAmount: string = "3 ETH";

  render() {
    return (
      <div class="divider">
        {this.gameState === GameState.Play ? (
          <div class="divider__status divider__status--turn">Your Turn</div>
        ) : this.gameState === GameState.Won ? (
          <div class="divider__status divider__status--won">
            <span class="result">You Won!</span>
            <span class="reward">{this.betAmount}</span>
          </div>
        ) : this.gameState === GameState.Lost ? (
          <div class="divider__status divider__status--lost">
            <span class="result">You Lost!</span>
            <span class="reward">{this.betAmount}</span>
          </div>
        ) : (
          <div class="divider__status divider__status--turn">It's a tie!</div>
        )}
      </div>
    );
  }
}
