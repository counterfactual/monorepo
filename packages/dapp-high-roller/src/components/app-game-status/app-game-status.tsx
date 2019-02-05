import { Component, Element, Prop } from "@stencil/core";

import CounterfactualTunnel from "../../data/counterfactual";
import { GameState, HighRollerStage } from "../../data/game-types";

@Component({
  tag: "app-game-status",
  styleUrl: "app-game-status.scss",
  shadow: true
})
export class AppGameStatus {
  @Element() el: HTMLStencilElement = {} as HTMLStencilElement;
  @Prop() gameState: GameState = GameState.Play;
  @Prop() highRollerStage: HighRollerStage = HighRollerStage.PRE_GAME;
  @Prop() isProposing: boolean = true;
  @Prop() betAmount: string = "3 ETH";
  @Prop() account: any = { user: { username: "Facundo" } };
  @Prop() opponent: any = { attributes: { username: "John" } };
  @Prop() label: string = "";

  get gameStatusLabelForTurn() {
    if (this.label) {
      return this.label;
    }

    const isTurnForFirstPlayer =
      this.highRollerStage === HighRollerStage.PRE_GAME;
    const isTurnForSecondPlayer =
      !this.isProposing &&
      this.highRollerStage === HighRollerStage.COMMITTING_NUM;

    if (isTurnForFirstPlayer || isTurnForSecondPlayer) {
      return "Your turn";
    }

    return `${this.opponent.attributes.username}'s turn`;
  }

  render() {
    return (
      <div class="divider">
        {this.gameState === GameState.Play ? (
          <div class="divider__status divider__status--turn">
            {this.gameStatusLabelForTurn}
          </div>
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

CounterfactualTunnel.injectProps(AppGameStatus, ["account", "opponent"]);
