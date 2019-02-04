import { Component, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import {
  GameState,
  HighRollerAppState,
  HighRollerStage
} from "../../data/game-types";
import HighRollerUITunnel from "../../data/high-roller";
import { AppInstance } from "../../data/mock-app-instance";
import {
  cf,
  HighRollerUIMutableState,
  HighRollerUIState
} from "../../data/types";

declare var ethers;
declare var web3;

const { solidityKeccak256 } = ethers.utils;
const { AddressZero, HashZero } = ethers.constants;

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  @Prop({ mutable: true }) state: any;
  @Prop({ mutable: true }) uiState: HighRollerUIState;

  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.state = {
      account: {},
      opponent: {},
      standalone: params.get("standalone") === "true" || false,
      appInstance: null,
      appFactory: null,
      cfProvider: null,
      updateAppInstance: this.updateAppInstance.bind(this),
      updateAppFactory: this.updateAppFactory.bind(this),
      updateUser: this.updateAccount.bind(this),
      updateOpponent: this.updateOpponent.bind(this),
      updateCfProvider: this.updateCfProvider.bind(this)
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
      highRollerState: {
        playerAddrs: [AddressZero, AddressZero],
        stage: HighRollerStage.PRE_GAME,
        salt: HashZero,
        commitHash: HashZero,
        playerFirstNumber: 0,
        playerSecondNumber: 0
      } as HighRollerAppState
    };
  }

  setupPlaygroundMessageListeners() {
    window.addEventListener("message", async (event: MessageEvent) => {
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
    console.log("appInstance updated", appInstance);
  }

  updateAppFactory(appFactory: cf.AppFactory) {
    this.state = { ...this.state, appFactory };
  }

  updateCfProvider(cfProvider: cf.Provider) {
    this.state = { ...this.state, cfProvider };
    console.log("CFProvider instance updated");
  }

  updateUIState(state: HighRollerUIMutableState) {
    this.uiState = { ...this.uiState, ...state };
    console.log("%cNew UI state detected", "font-size: 14px; color: red");
    console.log("    ", this.uiState);
  }

  generateRandomRoll() {
    return [
      1 + Math.floor(Math.random() * Math.floor(6)),
      1 + Math.floor(Math.random() * Math.floor(6))
    ];
  }

  async highRoller(num1: number, num2: number) {
    const randomness = solidityKeccak256(["uint256", "uint256"], [num1, num2]);

    // The Contract interface
    const abi = [
      "function highRoller(bytes32 randomness) public pure returns(uint8 playerFirstTotal, uint8 playerSecondTotal)"
    ];

    // Connect to the network
    const provider = new ethers.providers.Web3Provider(web3.currentProvider);

    const contractAddress = "0x6296F3ACf03b6D787BD1068B4DB8093c54d5d915";

    // We connect to the Contract using a Provider, so we will only
    // have read-only access to the Contract
    const contract = new ethers.Contract(contractAddress, abi, provider);

    const result = await contract.highRoller(randomness);

    return {
      myRoll: this.getDieNumbers(result[0]),
      opponentRoll: this.getDieNumbers(result[1])
    };
  }

  getDieNumbers(totalSum: number): [number, number] {
    // Choose result for each die.
    if (totalSum === 12) {
      return [6, 6];
    }

    if (totalSum > 2 && totalSum < 12) {
      return [Math.floor(totalSum / 2), Math.ceil(totalSum / 2)];
    }

    if (totalSum > 2 && totalSum % 2 === 0) {
      return [Math.floor(totalSum / 2) - 1, Math.ceil(totalSum / 2) + 1];
    }

    return [totalSum / 2, totalSum / 2];
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

  goToWaitingRoom(history: RouterHistory) {
    history.push({ pathname: "/waiting" });
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
                      cfProvider: this.state.cfProvider,
                      appInstance: this.state.appInstance,
                      goToWaitingRoom: this.goToWaitingRoom,
                      updateAppInstance: this.updateAppInstance
                    }}
                  />
                  <stencil-route
                    url="/"
                    exact={true}
                    component="app-provider"
                    componentProps={{
                      updateAppInstance: this.state.updateAppInstance,
                      updateAppFactory: this.state.updateAppFactory,
                      updateCfProvider: this.state.updateCfProvider,
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
