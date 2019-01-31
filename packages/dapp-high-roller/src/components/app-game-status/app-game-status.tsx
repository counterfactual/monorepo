import { Component, Element, Prop } from "@stencil/core";

import CounterfactualTunnel from "../../data/counterfactual";
import { GameState } from "../../data/game-types";

@Component({
  tag: "app-game-status",
  styleUrl: "app-game-status.scss",
  shadow: true
})
export class AppGameStatus {
  @Element() el: HTMLStencilElement = {} as HTMLStencilElement;
  @Prop() gameState: GameState = GameState.Play;
  @Prop() isProposing: boolean = true;
  @Prop() betAmount: string = "3 ETH";
  @Prop() account: any = { user: { username: "Facundo" } };
  @Prop() opponent: any = { attributes: { username: "John" } };

  render() {
    return (
      <div class="divider">
        {this.gameState === GameState.Play ? (
          <div class="divider__status divider__status--turn">Your turn</div>
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
