declare var ethers;

import { Component, Element, Prop, State, Watch } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import {
  Action,
  ActionType,
  GameState,
  HighRollerAppState,
  HighRollerStage,
  PlayerType
} from "../../data/game-types";
import HighRollerUITunnel from "../../data/high-roller";
import { AppInstance } from "../../data/mock-app-instance";
import { cf, HighRollerUIMutableState } from "../../data/types";
import { computeCommitHash, getProp } from "../../utils/utils";

const { AddressZero, HashZero } = ethers.constants;
const { bigNumberify } = ethers.utils;

// dice sound effect attributions:
// http://soundbible.com/182-Shake-And-Roll-Dice.html
// http://soundbible.com/181-Roll-Dice-2.html

@Component({
  tag: "app-game",
  styleUrl: "app-game.scss",
  shadow: true
})
export class AppGame {
  @Element() private el: HTMLStencilElement = {} as HTMLStencilElement;
  @Prop() history: RouterHistory = {} as RouterHistory;

  @Prop({ mutable: true }) betAmount: string = "3 ETH";
  @Prop({ mutable: true }) isProposing: boolean = false;
  @Prop({ mutable: true }) appInstanceId: string = "";

  @Prop() cfProvider: cf.Provider = {} as cf.Provider;
  @Prop({ mutable: true }) appInstance: AppInstance = {} as AppInstance;

  @Prop() account: any = { user: { username: "Facundo" } };
  @Prop() opponent: any = { attributes: { username: "John" } };

  @Prop() generateRandomRoll: () => number[] = () => [];

  @State() gameStatusLabel: string = "";

  defaultHighRollerState: HighRollerAppState = {
    playerAddrs: [AddressZero, AddressZero],
    stage: HighRollerStage.PRE_GAME,
    salt: HashZero,
    commitHash: HashZero,
    playerFirstNumber: 0,
    playerSecondNumber: 0
  };

  @Prop({ mutable: true }) highRollerState: HighRollerAppState = this
    .defaultHighRollerState;
  @Prop({ mutable: true }) gameState: GameState = GameState.Play;
  @Prop({ mutable: true }) myRoll: number[] = [1, 1];
  @Prop({ mutable: true }) myScore: number = 0;

  @Prop({ mutable: true }) opponentRoll: number[] = [1, 1];
  @Prop({ mutable: true }) opponentScore: number = 0;
  @Prop() updateUIState: (data: HighRollerUIMutableState) => void = () => {};

  shakeAudio!: HTMLAudioElement;
  rollAudio!: HTMLAudioElement;
  rollingAnimationInterval: {
    myRoll?: NodeJS.Timeout;
    opponentRoll?: NodeJS.Timeout;
  } = {};
  rolling: { myRoll: boolean; opponentRoll: boolean } = {
    myRoll: false,
    opponentRoll: false
  };

  async componentWillLoad() {
    this.betAmount = getProp("betAmount", this);
    this.isProposing = getProp("isProposing", this);
    this.appInstanceId = getProp("appInstanceId", this);
  }

  @Watch("highRollerState")
  async onHighRollerStateChanged() {
    if (
      this.highRollerState.stage === HighRollerStage.COMMITTING_NUM &&
      !this.rolling.opponentRoll
    ) {
      await this.beginRolling("opponentRoll");
    }
  }

  @Watch("gameState")
  async onGameStateChanged() {
    if (this.gameState !== GameState.Play) {
      await this.stopRolling("myRoll");
      await this.stopRolling("opponentRoll");
    }
  }

  async beginRolling(roller: "myRoll" | "opponentRoll") {
    this.shakeAudio.loop = true;
    await this.shakeAudio.play();

    this.rolling[roller] = true;
    this.scheduleRoll(roller);
  }

  scheduleRoll(roller: "myRoll" | "opponentRoll") {
    this.rollingAnimationInterval[roller] = setTimeout(
      async () => await this.roll(roller),
      100 + Math.floor(Math.random() * Math.floor(150))
    );
  }

  async roll(roller: "myRoll" | "opponentRoll") {
    this[roller] = this.generateRandomRoll();

    if (this.rolling[roller]) {
      this.scheduleRoll(roller);
    }
  }

  async stopRolling(roller: "myRoll" | "opponentRoll") {
    this.rolling[roller] = false;
    clearTimeout(this.rollingAnimationInterval[roller] as NodeJS.Timeout);
    this.shakeAudio.pause();
    await this.rollAudio.play();
  }

  async handleRoll(): Promise<void> {
    if (!this.appInstance.takeAction) {
      this.appInstance = await this.cfProvider.getOrCreateAppInstance(
        this.appInstanceId,
        this.appInstance
      );
      console.log("Reset appInstance", this.appInstance);
    }

    if (this.highRollerState.stage === HighRollerStage.PRE_GAME) {
      await this.beginRolling("myRoll");

      const startGameAction: Action = {
        number: 0,
        actionType: ActionType.START_GAME,
        actionHash: HashZero
      };

      this.highRollerState = await this.appInstance.takeAction(startGameAction);

      const numberSalt =
        "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
      const playerFirstNumber = Math.floor(Math.random() * Math.floor(1000));
      const hash = computeCommitHash(numberSalt, playerFirstNumber);

      const commitHashAction: Action = {
        number: 0,
        actionType: ActionType.COMMIT_TO_HASH,
        actionHash: hash
      };

      this.highRollerState = {
        ...(await this.appInstance.takeAction(commitHashAction)),
        playerFirstNumber: bigNumberify(playerFirstNumber)
      };

      this.updateUIState({
        highRollerState: this.highRollerState
      });
    } else {
      await this.beginRolling("myRoll");

      const playerSecondNumber = Math.floor(Math.random() * Math.floor(1000));

      const commitHashAction: Action = {
        number: playerSecondNumber,
        actionType: ActionType.COMMIT_TO_NUM,
        actionHash: HashZero
      };

      this.highRollerState = await this.appInstance.takeAction(
        commitHashAction
      );

      this.gameStatusLabel = "Who will win?";
    }
  }

  handleRematch(): void {
    this.gameState = GameState.Play;
    this.highRollerState = this.defaultHighRollerState;
  }

  handleExit(): void {
    this.history.push({
      pathname: "/wager",
      state: {},
      query: {},
      key: ""
    });
  }

  isMyTurn() {}

  render() {
    return [
      <div class="wrapper">
        <div class="game">
          <app-game-player
            playerName={this.opponent.attributes.username}
            playerScore={this.opponentScore}
            playerType={PlayerType.Black}
            playerRoll={this.opponentRoll}
          />
          <app-game-status
            gameState={this.gameState}
            isProposing={this.isProposing}
            betAmount={this.betAmount}
            highRollerStage={this.highRollerState.stage}
            label={this.gameStatusLabel}
          />
          <app-game-player
            playerName="You"
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

CounterfactualTunnel.injectProps(AppGame, [
  "account",
  "opponent",
  "cfProvider",
  "appInstance"
]);

HighRollerUITunnel.injectProps(AppGame, [
  "myRoll",
  "myScore",
  "opponentRoll",
  "opponentScore",
  "gameState",
  "updateUIState",
  "generateRandomRoll",
  "highRollerState"
]);
