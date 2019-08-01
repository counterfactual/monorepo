import { Component, Element, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import {
  GameState,
  HighRollerActionType,
  HighRollerAppState,
  HighRollerStage
} from "../../data/game-types";
import HighRollerUITunnel from "../../data/high-roller";
import { AppInstance } from "../../data/mock-app-instance";
import MockNodeProvider from "../../data/mock-node-provider";
import { cf, HighRollerUIMutableState, Node } from "../../data/types";

declare var cf;
declare var ethers;

const bn = ethers.utils.bigNumberify;

@Component({
  tag: "app-provider"
})
export class AppProvider {
  @Element() private readonly el: HTMLStencilElement = {} as HTMLStencilElement;

  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() updateAppInstance: (appInstance: AppInstance) => void = () => {};
  @Prop() updateAppFactory: (appFactory: cf.AppFactory) => void = () => {};
  @Prop() updateCfProvider: (cfProvider: cf.Provider) => void = () => {};
  @Prop() updateIntermediary: (intermediary: string) => void = () => {};
  @Prop() updateUIState: (data: HighRollerUIMutableState) => void = () => {};
  @Prop() goToGame: (history: RouterHistory) => void = () => {};
  @Prop() highRoller: (
    num1: number,
    num2: number
  ) => Promise<{
    playerFirstRoll: number[];
    playerSecondRoll: number[];
  }> = async () => ({
    playerFirstRoll: [0, 0],
    playerSecondRoll: [0, 0]
  });
  @Prop() generateRandomRoll: () => number[] = () => [0, 0];
  @Prop() highRollerState: HighRollerAppState = {} as HighRollerAppState;
  @Prop() gameState: GameState = GameState.Play;
  @Prop() myRoll: number[] = [1, 1];
  @Prop() myScore: number = 0;

  @Prop() opponentRoll: number[] = [1, 1];
  @Prop() opponentScore: number = 0;

  @Prop({ mutable: true })
  nodeProvider: MockNodeProvider = {} as MockNodeProvider;

  @Prop({ mutable: true }) cfProvider: cf.Provider = {} as cf.Provider;

  @Prop({ mutable: true }) appFactory: cf.AppFactory = {} as cf.AppFactory;

  @Prop({ mutable: true }) appInstance: AppInstance = {} as AppInstance;
  @Prop() intermediary: string = "";

  async componentWillLoad() {
    const params = new URLSearchParams(window.location.search);

    this.nodeProvider = !params.get("standalone")
      ? new cf.NodeProvider()
      : new MockNodeProvider();

    await this.nodeProvider.connect();

    this.setupCfProvider();
  }

  setupCfProvider() {
    this.cfProvider = new cf.Provider(this.nodeProvider);

    this.cfProvider.on("chan_updateState", this.onUpdateState.bind(this));
    this.cfProvider.on("chan_uninstall", this.onUninstall.bind(this));
    this.cfProvider.on("chan_installVirtual", this.onInstall.bind(this));

    const highRollerAppDefinitionAddr =
      "0x144F1A5C2db59B58f2c73d09A2acb27a57E47618";
    this.appFactory = new cf.AppFactory(
      // TODO: This probably should be in a configuration, somewhere.
      highRollerAppDefinitionAddr,
      {
        actionEncoding:
          "tuple(uint8 actionType, uint256 number, bytes32 actionHash)",
        stateEncoding: `
          tuple(
            uint8 stage,
            bytes32 salt,
            bytes32 commitHash,
            uint256 playerFirstNumber,
            uint256 playerSecondNumber,
            uint256 versionNumber
          )
        `
      },
      this.cfProvider
    );

    this.updateAppFactory(this.appFactory);
    this.updateCfProvider(this.cfProvider);
  }

  isReadyForHighRoller(state: HighRollerAppState) {
    return (
      bn(state.playerFirstNumber).toNumber() &&
      bn(state.playerSecondNumber).toNumber() &&
      state.stage === HighRollerStage.P1_REVEALED_NUM
    );
  }

  async onUpdateState({ data }: { data: Node.UpdateStateEventData }) {
    const newState = (data as Node.UpdateStateEventData)
      .newState as HighRollerAppState;

    const state = {
      ...newState,
      playerFirstNumber:
        this.highRollerState.playerFirstNumber || newState["playerFirstNumber"]
    } as HighRollerAppState;

    console.log(
      "playerFirstNumber",
      state.playerFirstNumber,
      "playerSecondNumber",
      state.playerSecondNumber
    );

    if (state.stage === HighRollerStage.P2_COMMITTED_TO_NUM) {
      return await this.appInstance.takeAction({
        actionType: HighRollerActionType.REVEAL_NUM,
        actionHash: this.highRollerState.salt,
        number: state.playerFirstNumber
      });
    }

    if (!this.isReadyForHighRoller(state)) {
      this.updateUIState({ highRollerState: state });
      return;
    }

    let myScore = this.myScore;
    let opponentScore = this.opponentScore;
    let gameState;

    const rolls = await this.highRoller(
      state.playerFirstNumber,
      state.playerSecondNumber
    );

    const myRoll = rolls.playerSecondRoll;
    const opponentRoll = rolls.playerFirstRoll;

    const totalMyRoll = myRoll[0] + myRoll[1];
    const totalOpponentRoll = opponentRoll[0] + opponentRoll[1];

    if (totalMyRoll > totalOpponentRoll) {
      myScore = this.myScore + 1;
      gameState = GameState.Won;
    } else if (totalMyRoll < totalOpponentRoll) {
      opponentScore += 1;
      gameState = GameState.Lost;
    } else {
      gameState = GameState.Tie;
    }

    const highRollerState = state;
    const newUIState = {
      myRoll,
      opponentRoll,
      myScore,
      opponentScore,
      gameState,
      highRollerState
    };

    this.updateUIState(newUIState);

    // @ts-ignore - no idea why this causes an error...
    if (state.stage === HighRollerStage.P1_REVEALED_NUM) {
      await this.appInstance.uninstall(this.intermediary);
    }
  }

  onInstall(data) {
    this.updateAppInstance(data.data.appInstance);
    this.goToGame(this.history);
  }

  onUninstall(data: Node.EventData) {}

  render() {
    return <slot />;
  }
}

HighRollerUITunnel.injectProps(AppProvider, [
  "myRoll",
  "myScore",
  "opponentRoll",
  "opponentScore",
  "gameState",
  "updateUIState",
  "highRollerState"
]);

CounterfactualTunnel.injectProps(AppProvider, ["appInstance", "intermediary"]);
