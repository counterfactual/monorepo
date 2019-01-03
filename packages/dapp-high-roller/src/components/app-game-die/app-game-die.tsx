import { Component, Prop } from "@stencil/core";

import { PlayerType } from "../../enums/enums";

const DICE_PATH = "./assets/images/dice/TYPE/Dice-TYPE-0";

@Component({
  tag: "app-game-die",
  styleUrl: "app-game-die.scss",
  shadow: true
})
export class AppGameDie {
  @Prop() playerType: PlayerType = PlayerType.Dark;
  @Prop() colorClass: string = "black";
  @Prop() value: number = 1;

  render() {
    const dicePath = DICE_PATH.replace(/TYPE/gi, this.playerType);

    return (
      <div class="die__wrapper">
        <div class={`die__faces die__face-${this.value}`}>
          <img src={`${dicePath}1.svg`} class={`die__1 ${this.colorClass}`} alt="" />
          <img src={`${dicePath}2.svg`} class={`die__2 ${this.colorClass}`} alt="" />
          <img src={`${dicePath}3.svg`} class={`die__3 ${this.colorClass}`} alt="" />
          <img src={`${dicePath}4.svg`} class={`die__4 ${this.colorClass}`} alt="" />
          <img src={`${dicePath}5.svg`} class={`die__5 ${this.colorClass}`} alt="" />
          <img src={`${dicePath}6.svg`} class={`die__6 ${this.colorClass}`} alt="" />
        </div>
      </div>
    );
  }
}
