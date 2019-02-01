import { Component, Element, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import { GameState, HighRollerAppState } from "../../data/game-types";
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
  @Element() private el: HTMLStencilElement = {} as HTMLStencilElement;

  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() updateAppInstance: (appInstance: AppInstance) => void = () => {};
  @Prop() updateAppFactory: (appFactory: cf.AppFactory) => void = () => {};
  @Prop() updateCfProvider: (cfProvider: cf.Provider) => void = () => {};
  @Prop() updateUIState: (data: HighRollerUIMutableState) => void = () => {};
  @Prop() goToGame: (history: RouterHistory) => void = () => {};
  @Prop() highRoller: (
    num1: number,
    num2: number
  ) => { myRoll: number[]; opponentRoll: number[] } = () => ({
    myRoll: [0, 0],
    opponentRoll: [0, 0]
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

  async componentWillLoad() {
    const params = new URLSearchParams(window.location.search);

    this.nodeProvider = !params.get("standalone")
      ? new NodeProvider()
      : new cf.NodeProvider();

    await this.nodeProvider.connect();

    this.setupCfProvider();
  }

  setupCfProvider() {
    this.cfProvider = new cf.Provider(this.nodeProvider);

    this.cfProvider.on("updateState", this.onUpdateState.bind(this));
    this.cfProvider.on("uninstall", this.onUninstall.bind(this));
    this.cfProvider.on("installVirtual", this.onInstall.bind(this));

    this.appFactory = new cf.AppFactory(
      // TODO: This probably should be in a configuration, somewhere.
      "0x6296F3ACf03b6D787BD1068B4DB8093c54d5d915",
      {
        actionEncoding:
          "tuple(uint8 actionType, uint256 number, bytes32 actionHash)",
        stateEncoding:
          "tuple(address[2] playerAddrs, uint8 stage, bytes32 salt, bytes32 commitHash, uint256 playerFirstNumber, uint256 playerSecondNumber)"
      },
      this.cfProvider
    );

    this.updateAppFactory(this.appFactory);
    this.updateCfProvider(this.cfProvider);
  }

  isReadyForHighRoller(state) {
    return (
      bn(state.playerFirstNumber).toNumber() &&
      bn(state.playerSecondNumber).toNumber()
    );
  }

  async onUpdateState({ data }: { data: Node.UpdateStateEventData }) {
    const newStateArray = (data as Node.UpdateStateEventData).newState;

    const state = {
      playerAddrs: newStateArray[0],
      stage: newStateArray[1],
      salt: newStateArray[2],
      commitHash: newStateArray[3],
      playerFirstNumber: this.highRollerState.playerFirstNumber || {
        _hex: "0x00"
      },
      playerSecondNumber: newStateArray[5]
    } as HighRollerAppState;

    console.log(
      "playerFirstNumber",
      state.playerFirstNumber,
      "playerSecondNumber",
      state.playerSecondNumber
    );

    if (!this.isReadyForHighRoller(state)) {
      this.updateUIState({ highRollerState: state });
      return;
    }

    const rolls = await this.highRoller(
      state.playerFirstNumber,
      state.playerSecondNumber
    );

    const myRoll = rolls.myRoll;
    const opponentRoll = rolls.opponentRoll;
    const totalMyRoll = myRoll[0] + myRoll[1];
    const totalOpponentRoll = opponentRoll[0] + opponentRoll[1];

    let myScore = this.myScore;
    let opponentScore = this.opponentScore;
    let gameState;

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

    debugger;
    await this.appInstance.uninstall();
  }

  onInstall(data) {
    this.updateAppInstance(data.data.appInstance);
    this.goToGame(this.history);
  }

  onUninstall(data: Node.EventData) {
    const uninstallData = data as Node.UninstallEventData;
    debugger;
  }

  render() {
    return <div />;
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

CounterfactualTunnel.injectProps(AppProvider, ["appInstance"]);
