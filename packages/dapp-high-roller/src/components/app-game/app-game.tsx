import { Component, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import { GameState, PlayerType } from "../../enums/enums";

const DARK_PATH = "./assets/images/dice/Dark/Dice-Dark-0";
const LIGHT_PATH = "./assets/images/dice/Light/Dice-Light-0";

// dice sound effect attributions:
// http://soundbible.com/182-Shake-And-Roll-Dice.html
// http://soundbible.com/181-Roll-Dice-2.html

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

  shakeAudio!: HTMLAudioElement;
  rollAudio!: HTMLAudioElement;

  componentWillLoad() {
    this.myName = this.history.location.state.myName
      ? this.history.location.state.myName
      : this.myName;
    this.betAmount = this.history.location.state.betAmount
      ? this.history.location.state.betAmount
      : this.betAmount;
  }

  generateRoll() {
    return [
      1 + Math.floor(Math.random() * Math.floor(6)),
      1 + Math.floor(Math.random() * Math.floor(6))
    ];
  }

  async animateRoll(roller): Promise<void> {
    this.shakeAudio.loop = true;
    this.shakeAudio.play();

    for (let i = 0; i < 10; i += 1) {
      this[roller] = this.generateRoll();

      await new Promise(resolve =>
        setTimeout(resolve, 100 + Math.floor(Math.random() * Math.floor(150)))
      );
    }

    this.shakeAudio.pause();
    this.rollAudio.play();
  }

  async handleRoll(): Promise<void> {
    await Promise.all([
      this.animateRoll("myRoll"),
      this.animateRoll("opponentRoll")
    ]);

    this.myRoll = this.generateRoll();
    this.opponentRoll = this.generateRoll();
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
    return [
      <div class="wrapper">
        <div class="game">
          <app-game-player
            playerName={this.opponentName}
            playerScore={this.opponentScore}
            playerType={PlayerType.Black}
            playerRoll={this.opponentRoll}
          />
          <app-game-status
            gameState={this.gameState}
            betAmount={this.betAmount}
          />
          <app-game-player
            playerName={this.myName}
            playerScore={this.myScore}
            playerType={PlayerType.White}
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

          <div>
            <audio ref={el => (this.shakeAudio = el as HTMLAudioElement)}>
              <source src="/assets/audio/shake.mp3" type="audio/mpeg" />
            </audio>
            <audio ref={el => (this.rollAudio = el as HTMLAudioElement)}>
              <source src="/assets/audio/roll.mp3" type="audio/mpeg" />
            </audio>
          </div>
        </div>
      </div>,
      this.gameState === GameState.Won ? <app-game-coins /> : undefined
    ];
  }
}
