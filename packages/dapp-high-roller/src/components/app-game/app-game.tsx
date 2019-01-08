declare var ethers;

import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import { GameState, PlayerType } from "../../enums/enums";

const { AddressZero } = ethers.constants;
const { solidityKeccak256 } = ethers.utils;


// dice sound effect attributions:
// http://soundbible.com/182-Shake-And-Roll-Dice.html
// http://soundbible.com/181-Roll-Dice-2.html

enum HighRollerStage {
  PRE_GAME,
  COMMITTING_HASH,
  COMMITTING_NUM,
  DONE
}

type HighRollerAppState = {
  playerAddrs: string[];
  stage: HighRollerStage;
  salt: string;
  commitHash: string;
  playerFirstNumber: number;
  playerSecondNumber: number;
};

enum ActionType {
  START_GAME,
  COMMIT_TO_HASH,
  COMMIT_TO_NUM
}

type Action = {
  actionType: ActionType;
  number: number;
  actionHash: string;
};

/**
 * Bob(Proposing) waits for Alice(Accepting) to roll dice - onUpdateState()?
 * Alice(Accepting) rolls dice - Call takeAction(action.actionType: COMMIT_TO_NUM, num)
 */
function onUpdateState(): Promise<HighRollerAppState> {
  return new Promise<HighRollerAppState>((resolve, reject) => {
    const state: HighRollerAppState = {
      playerAddrs: [AddressZero, AddressZero],
      stage: HighRollerStage.COMMITTING_NUM,
      salt: nullValueBytes32,
      commitHash: nullValueBytes32,
      playerFirstNumber: 0,
      playerSecondNumber: 3
    };
    return setTimeout(() => {
      return resolve(state);
    }, 3000);
  });
}

async function takeAction(action: Action): Promise<HighRollerAppState> {
  // console.log(action);
  if (action.actionType === ActionType.START_GAME) {
    const state: HighRollerAppState = {
      playerAddrs: [AddressZero, AddressZero],
      stage: HighRollerStage.COMMITTING_HASH,
      salt: nullValueBytes32,
      commitHash: nullValueBytes32,
      playerFirstNumber: 0,
      playerSecondNumber: 0
    };
    return new Promise<HighRollerAppState>((resolve, reject) => {
      return setTimeout(() => {
        return resolve(state);
      }, 3000);
    });
  }
  if (action.actionType === ActionType.COMMIT_TO_HASH) {
    const state: HighRollerAppState = {
      playerAddrs: [AddressZero, AddressZero],
      stage: HighRollerStage.COMMITTING_NUM,
      salt: nullValueBytes32,
      commitHash: nullValueBytes32,
      playerFirstNumber: 0,
      playerSecondNumber: 0
    };
    return new Promise<HighRollerAppState>((resolve, reject) => {
      return setTimeout(() => {
        return resolve(state);
      }, 3000);
    });
  }
  const state: HighRollerAppState = {
    playerAddrs: [AddressZero, AddressZero],
    stage: HighRollerStage.DONE,
    salt: nullValueBytes32,
    commitHash: nullValueBytes32,
    playerFirstNumber: 0,
    playerSecondNumber: 0
  };
  return new Promise<HighRollerAppState>((resolve, reject) => {
    return setTimeout(() => {
      return resolve(state);
    }, 3000);
  });
}

// Default value instead of null Bytes32
const nullValueBytes32 =
  "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc94";

/// Returns the commit hash that can be used to commit to chosenNumber
/// using appSalt
function computeCommitHash(appSalt: string, chosenNumber: number) {
  return solidityKeccak256(["bytes32", "uint256"], [appSalt, chosenNumber]);
}

@Component({
  tag: "app-game",
  styleUrl: "app-game.scss",
  shadow: true
})
export class AppGame {
  @Element() private el: HTMLStencilElement = {} as HTMLStencilElement;
  @Prop() history: RouterHistory;

  @Prop({ mutable: true }) myName: string = "Facundo";
  @Prop({ mutable: true }) betAmount: string = "3 ETH";
  @Prop({ mutable: true }) opponentName: string = "John";
  @Prop({ mutable: true }) isProposing: boolean = false;

  defaultHighRollerState: HighRollerAppState = {
    playerAddrs: [AddressZero, AddressZero],
    stage: HighRollerStage.PRE_GAME,
    salt: nullValueBytes32,
    commitHash: nullValueBytes32,
    playerFirstNumber: 0,
    playerSecondNumber: 0
  };

  @State() highRollerState: HighRollerAppState = this.defaultHighRollerState;
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
    this.opponentName = this.history.location.state.opponentName
      ? this.history.location.state.opponentName
      : this.opponentName;
    this.isProposing = this.history.location.state.isProposing
      ? this.history.location.state.isProposing
      : this.isProposing;
  }

  generateRandomRoll() {
    return [
      1 + Math.floor(Math.random() * Math.floor(6)),
      1 + Math.floor(Math.random() * Math.floor(6))
    ];
  }

  highRoller(num1: number, num2: number) {
    const randomness = solidityKeccak256(["uint256", "uint256"], [num1, num2]);
    return {
      myRoll: this.generateRandomRoll(),
      opponentRoll: this.generateRandomRoll()
    };
  }

  async animateRoll(roller): Promise<void> {
    this.shakeAudio.loop = true;
    this.shakeAudio.play();

    for (let i = 0; i < 10; i += 1) {
      this[roller] = this.generateRandomRoll();

      await new Promise(resolve =>
        setTimeout(resolve, 100 + Math.floor(Math.random() * Math.floor(150)))
      );
    }

    this.shakeAudio.pause();
    this.rollAudio.play();
  }

  async handleRoll(): Promise<void> {
    if (this.isProposing) {
      if (this.highRollerState.stage === HighRollerStage.PRE_GAME) {
        await Promise.all([
          this.animateRoll("myRoll"),
          this.animateRoll("opponentRoll")
        ]);
        const startGameAction: Action = {
          number: 0,
          actionType: ActionType.START_GAME,
          actionHash: nullValueBytes32
        };
        this.highRollerState = await takeAction(startGameAction);
        const numberSalt =
          "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
        const playerFirstNumber = Math.floor(Math.random() * Math.floor(1000));
        const hash = computeCommitHash(numberSalt, playerFirstNumber);

        const commitHashAction: Action = {
          number: playerFirstNumber,
          actionType: ActionType.COMMIT_TO_HASH,
          actionHash: hash
        };
        this.highRollerState = await takeAction(commitHashAction);
        onUpdateState().then((state: HighRollerAppState) => {
          const rolls = this.highRoller(
            state.playerFirstNumber,
            state.playerSecondNumber
          );
          this.myRoll = rolls.myRoll;
          this.opponentRoll = rolls.opponentRoll;
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
          this.highRollerState = state;
        });
      }
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

CounterfactualTunnel.injectProps(AppGame, ["appFactory"]);
