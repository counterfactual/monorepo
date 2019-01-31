import { Component, Element, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import { GameState, HighRollerAppState } from "../../data/game-types";
import HighRollerUITunnel, {
  HighRollerUIMutableState,
  HighRollerUIState
} from "../../data/high-roller";
import { AppInstance } from "../../data/mock-app-instance";
import MockNodeProvider from "../../data/mock-node-provider";
import { cf, Node } from "../../data/types";

declare var NodeProvider;
declare var cf;
declare var ethers;

const { solidityKeccak256 } = ethers.utils;

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  @Prop({ mutable: true }) state: any;
  @Prop({ mutable: true }) uiState: HighRollerUIState;
  nodeProvider: any;
  cfProvider: cf.Provider = {} as cf.Provider;
  appFactory: cf.AppFactory = {} as cf.AppFactory;
  @State() appInstance: AppInstance = {} as AppInstance;

  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.state = {
      account: {},
      opponent: {},
      standalone: params.get("standalone") === "true" || false,
      appInstance: null,
      appFactory: null,
      updateAppInstance: this.updateAppInstance.bind(this),
      updateAppFactory: this.updateAppFactory.bind(this),
      updateUser: this.updateAccount.bind(this),
      updateOpponent: this.updateOpponent.bind(this)
    };
    this.uiState = {
      myRoll: [0, 0],
      myScore: 0,
      opponentRoll: [0, 0],
      opponentScore: 0,
      gameState: GameState.Play,
      updateUIState: this.updateUIState.bind(this),
      highRoller: this.highRoller.bind(this),
      generateRandomRoll: this.generateRandomRoll.bind(this),
      highRollerState: {} as HighRollerAppState
    };
  }

  setupPlaygroundMessageListeners() {
    window.addEventListener("message", (event: MessageEvent) => {
      if (
        typeof event.data === "string" &&
        event.data.startsWith("playground:response:user")
      ) {
        const [, data] = event.data.split("|");
        const account = JSON.parse(data);
        this.updateAccount(account);

        if (this.state.appInstance) {
          this.updateOpponent({
            attributes: {
              username: this.state.appInstance.initialState.playerNames.find(
                username => username !== this.state.account.user.username
              ),
              nodeAddress: this.state.appInstance.initialState.initiatingAddress
            }
          });
        }
      }

      if (
        typeof event.data === "string" &&
        event.data.startsWith("playground:appInstance")
      ) {
        const [, data] = event.data.split("|");

        if (data) {
          const { appInstance } = JSON.parse(data);
          this.updateAppInstance(appInstance);
        }
      }
    });
  }

  async componentWillLoad() {
    this.setupPlaygroundMessageListeners();
  }

  async componentDidLoad() {
    window.parent.postMessage("playground:request:user", "*");

    if (this.state.standalone) {
      const mockAccount = {
        user: {
          address: "0xc60b9023bb8dc153b4046977328ce79af12a77e0",
          email: "alon2@example.com",
          id: "687297bc-8014-4c82-8cee-3b7ca7db09d4",
          username: "MyName"
        },
        multisigAddress: "0x9499ac5A66c36447e535d252c049304D80961CED"
      };
      this.updateAccount(mockAccount);
    }
  }

  updateAccount(account: any) {
    this.state = { ...this.state, account };
  }

  updateOpponent(opponent: any) {
    this.state = { ...this.state, opponent };
  }

  updateAppInstance(appInstance: AppInstance) {
    this.state = { ...this.state, appInstance };
  }

  updateAppFactory(appFactory: cf.AppFactory) {
    this.state = { ...this.state, appFactory };
  }

  updateUIState(state: HighRollerUIMutableState) {
    this.uiState = { ...this.uiState, ...state };
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

  goToGame(history: RouterHistory, isProposing: boolean = true) {
    history.push({
      pathname: "/game",
      state: {
        isProposing,
        betAmount: "0.1"
      },
      query: {},
      key: ""
    });
  }

  render() {
    return (
      <div class="height-100">
        <main class="height-100">
          <CounterfactualTunnel.Provider state={this.state}>
            <HighRollerUITunnel.Provider state={this.uiState}>
              <stencil-router>
                <stencil-route-switch scrollTopOffset={0}>
                  <stencil-route
                    url="/"
                    exact={true}
                    component="app-logo"
                    componentProps={{
                      appInstance: this.state.appInstance,
                      goToGame: this.goToGame
                    }}
                  />
                  <stencil-route
                    url="/"
                    exact={true}
                    component="app-provider"
                    componentProps={{
                      updateAppInstance: this.state.updateAppInstance,
                      updateAppFactory: this.state.updateAppFactory,
                      updateUIState: this.uiState.updateUIState,
                      highRoller: this.uiState.highRoller,
                      generateRandomRoll: this.uiState.generateRandomRoll,
                      goToGame: this.goToGame
                    }}
                  />
                  <stencil-route
                    url="/wager"
                    component="app-wager"
                    componentProps={{
                      updateOpponent: this.state.updateOpponent
                    }}
                  />
                  <stencil-route url="/game" component="app-game" />
                  <stencil-route url="/waiting" component="app-waiting" />
                  <stencil-route
                    url="/accept-invite"
                    component="app-accept-invite"
                  />
                </stencil-route-switch>
              </stencil-router>
            </HighRollerUITunnel.Provider>
          </CounterfactualTunnel.Provider>
        </main>
      </div>
    );
  }
}
