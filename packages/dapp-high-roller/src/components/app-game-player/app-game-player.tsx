import { Component, Prop } from "@stencil/core";

import { PlayerType } from "../../enums/enums";

const DICE_PATH = "./assets/images/dice/TYPE/Dice-TYPE-0";

@Component({
  tag: "app-game-player",
  styleUrl: "app-game-player.scss",
  shadow: true
})
export class AppGamePlayer {
  @Prop() playerName: string = "";
  @Prop() playerScore: number = 0;
  @Prop() playerType: PlayerType = PlayerType.Dark;
  @Prop() playerRoll: number[] = [1, 1];

  render() {
    const colorClass = this.playerType === PlayerType.Dark ? "black" : "white";

    return (
      <div class="player">
        <div class="player-info">
          <span class={`player-info__name ${this.playerType}`}>
            {this.playerName}
          </span>
          <div class="player-info__status">
            <span class={`player-info__status__color ${colorClass}`} />
            <span class="player-info__status__score">{this.playerScore}</span>
          </div>
        </div>

        <div class="player__dice">
          <app-game-die playerType={this.playerType} value={this.playerRoll[0]} colorClass={colorClass} />
          <app-game-die playerType={this.playerType} value={this.playerRoll[1]} colorClass={colorClass} />
        </div>
      </div>
    );
  }
}
