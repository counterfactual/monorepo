declare var ethers;

import { Component, Element, Prop, State, Watch } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import CounterfactualTunnel from "../../data/counterfactual";
import { HighRollerAppState, HighRollerStage } from "../../data/game-types";
import { Address, AppInstanceID, cf } from "../../data/types";

const { HashZero } = ethers.constants;

// FIXME: Figure out how to import @counterfactual-types
// const { AssetType } = commonTypes;

/**
 * User Story
 * 0.1 ETH is staked hard coded
 * The username is retrieved from the Playground
 */
@Component({
  tag: "app-wager",
  styleUrl: "app-wager.scss",
  shadow: true
})
export class AppWager {
  @Element() private el: HTMLStencilElement = {} as HTMLStencilElement;

  @Prop() history: RouterHistory = {} as RouterHistory;
  @Prop() appFactory: cf.AppFactory = {} as cf.AppFactory;
  @State() betAmount: string = "0.01";
  @State() myName: string = "";

  @State() opponent: {
    attributes: {
      username?: string;
      ethAddress?: Address;
      nodeAddress?: string;
    };
  } = { attributes: {} };
  @State() intermediary: string = "";
  @State() isError: boolean = false;
  @State() isWaiting: boolean = false;
  @State() error: any;
  @Prop() account: any;
  @Prop() standalone: boolean = false;

  @Prop() updateAppInstance: (
    appInstance: { id: AppInstanceID }
  ) => void = () => {};
  @Prop() updateOpponent: (opponent: any) => void = () => {};

  async componentWillLoad() {
    this.myName = this.account.user.username;

    return await this.matchmake();
  }

  /**
   * Bob(Proposing) clicks the Play! button. He is routed to a waiting room to wait for an opponent
   * @param e
   */
  async handlePlay(e: Event): Promise<void> {
    e.preventDefault();

    try {
      const initialState: HighRollerAppState = {
        playerAddrs: [
          this.account.user.ethAddress,
          this.opponent.attributes.ethAddress
        ],
        stage: HighRollerStage.PRE_GAME,
        salt: HashZero,
        commitHash: HashZero,
        playerFirstNumber: 0,
        playerSecondNumber: 0,
        playerNames: [
          this.account.user.username,
          this.opponent.attributes.username
        ]
      };

      const provider = new ethers.providers.Web3Provider(
        window["web3"].currentProvider
      );
      const currentEthBalance = ethers.utils.parseEther(this.account.balance);
      const minimumEthBalance = ethers.utils.parseEther(this.betAmount).add(
        await provider.estimateGas({
          to: this.opponent.attributes.nodeAddress,
          value: ethers.utils.parseEther(this.betAmount)
        })
      );

      if (currentEthBalance.lt(minimumEthBalance)) {
        this.error = `Insufficient funds: You need at least ${ethers.utils.formatEther(
          minimumEthBalance
        )} ETH to play.`;
        return;
      }

      await this.appFactory.proposeInstallVirtual({
        initialState,
        proposedToIdentifier: this.opponent.attributes.nodeAddress as string,
        asset: {
          assetType: 0 /* AssetType.ETH */
        },
        peerDeposit: 0, // ethers.utils.parseEther(this.betAmount),
        myDeposit: 0, // ethers.utils.parseEther(this.betAmount),
        timeout: 10000,
        intermediaries: [this.intermediary]
      });

      this.isWaiting = true;
    } catch (e) {
      debugger;
    }
  }

  async matchmake(): Promise<any> {
    try {
      const result = await this.fetchMatchmake();

      this.opponent = {
        attributes: {
          username: result.data.attributes.username,
          nodeAddress: result.data.attributes.nodeAddress,
          ethAddress: result.data.attributes.ethAddress
        }
      };
      this.intermediary = result.data.attributes.intermediary;
      this.error = null;

      this.updateOpponent(this.opponent);
    } catch (error) {
      this.error = error;
    }
  }

  @Watch("error")
  onErrorSet() {
    this.isError = !!this.error;
  }

  handleChange(e: Event, prop: string): void {
    this[prop] = (e.target as HTMLInputElement).value;
  }

  private async fetchMatchmake(): Promise<{ [key: string]: any }> {
    if (this.standalone) {
      return {
        data: {
          type: "matchmaking",
          id: "2b83cb14-c7aa-5208-8da8-369aeb1a3f24",
          attributes: {
            intermediary: this.account.multisigAddress
          },
          relationships: {
            users: {
              data: {
                type: "users",
                id: this.account.user.id
              }
            },
            matchedUser: {
              data: {
                type: "matchedUsers",
                id: "3d54b508-b355-4323-8738-4cdf7290a2fd"
              }
            }
          }
        },
        included: [
          {
            type: "users",
            id: this.account.user.id,
            attributes: {
              username: this.account.user.username,
              ethAddress: this.account.user.ethAddress
            }
          },
          {
            type: "matchedUsers",
            id: "3d54b508-b355-4323-8738-4cdf7290a2fd",
            attributes: {
              username: "MyOpponent",
              ethAddress: "0x12345"
            }
          }
        ]
      };
    }

    return new Promise(resolve => {
      const onMatchmakeResponse = (event: MessageEvent) => {
        if (
          !event.data.toString().startsWith("playground:response:matchmake")
        ) {
          return;
        }

        window.removeEventListener("message", onMatchmakeResponse);

        const [, data] = event.data.split("|");
        resolve(JSON.parse(data));
      };

      window.addEventListener("message", onMatchmakeResponse);

      window.parent.postMessage("playground:request:matchmake", "*");
    });
  }

  render() {
    if (this.isWaiting) {
      return (
        <app-waiting
          myName={this.myName}
          betAmount={this.betAmount}
          opponentName={this.opponent.attributes.username}
          isProposing={true}
        />
      );
    }

    return (
      <div class="wrapper">
        <div class="wager">
          <div class="message">
            <img
              class="message__icon"
              src="/assets/images/logo.svg"
              alt="High Roller"
            />
            <h1 class="message__title">Welcome!</h1>
            <p class="message__body">Ready to play?</p>
          </div>
          <form class="form" onSubmit={(e: Event) => this.handlePlay(e)}>
            <label htmlFor="myName">Your Name</label>
            <input
              class="form__input"
              id="myName"
              type="text"
              placeholder="Your name"
              value={this.myName}
              onInput={e => this.handleChange(e, "myName")}
              readOnly={true}
            />
            <label htmlFor="betAmount">Bet Amount ( ETH )</label>
            <input
              class="form__input"
              id="betAmount"
              type="number"
              placeholder="3 ETH"
              value={this.betAmount}
              onInput={e => this.handleChange(e, "betAmount")}
              readonly={true}
              step="0.01"
            />
            {this.isError ? (
              <label class="message__error">
                {this.error instanceof Error
                  ? `${this.error.message}: ${this.error.stack}`
                  : this.error}
              </label>
            ) : (
              {}
            )}
            <button class="form__button">
              <div>Play!</div>
            </button>
          </form>
        </div>
      </div>
    );
  }
}

CounterfactualTunnel.injectProps(AppWager, [
  "appFactory",
  "updateAppInstance",
  "account",
  "opponent",
  "standalone"
]);
