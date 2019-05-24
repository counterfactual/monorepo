import { Component, Element, Event, EventEmitter, Prop } from "@stencil/core";
import { JsonApi } from "@counterfactual/types";

import CounterfactualNode from "../../../data/counterfactual";
import PlaygroundAPIClient from "../../../data/playground-api-client";
import AccountTunnel from "../../../data/account";
import { AppDefinition, UserSession } from "../../../types";

@Component({
  tag: "apps-list",
  styleUrl: "apps-list.scss",
  shadow: true
})
export class AppsList {
  @Element() el: HTMLStencilElement = {} as HTMLStencilElement;
  @Event() appClicked: EventEmitter = {} as EventEmitter;
  @Prop() apps: AppDefinition[] = [];
  @Prop() name: string = "";
  @Prop() user: UserSession = {} as UserSession;

  appClickedHandler(event) {
    this.appClicked.emit(event.detail);
  }

  async proposeInstallVirtual() {
    const cfProvider = CounterfactualNode.getCfProvider();

    const opponent = await PlaygroundAPIClient.matchmake(
      window.localStorage.getItem("playground:user:token") as string,
      window.localStorage.getItem("playground:matchmakeWith")
    );

    const response = JSON.stringify(opponent);
    window.localStorage.setItem("playground:lastMatchmake", response);

    const appId = "0x91907355C59BA005843E791c88aAB80b779446c9";
    const encodings = {
      actionEncoding:
        "tuple(uint8 actionType, uint256 number, bytes32 actionHash)",
      stateEncoding:
        "tuple(address[2] playerAddrs, uint8 stage, bytes32 salt, bytes32 commitHash, uint256 playerFirstNumber, uint256 playerSecondNumber)"
    }

    const { attributes: { nodeAddress, intermediary } } = opponent.data as JsonApi.Resource;

    cfProvider.proposeInstallVirtual({
      initialState: {},
      proposedToIdentifier: nodeAddress as string,
      asset: {
        assetType: 0 /* AssetType.ETH */
      },
      peerDeposit: ethers.utils.parseEther("0.001"),
      myDeposit: ethers.utils.parseEther("0.001"),
      timeout: 172800,
      intermediaries: [intermediary],
      appId,
      encodings
    })
  }

  render() {
    return (
      <div class="apps">
        <h2 class="title">{this.name}</h2>

        <a
          id="installVirtualLink"
          onClick={() => this.proposeInstallVirtual()}
        >
          Propose Install Virtual 
        </a>

        <ul class="list">
          {this.apps.map(app => (
            <apps-list-item
              onAppClicked={e => this.appClickedHandler(e)}
              icon={app.icon}
              name={app.name}
              notifications={app.notifications}
              url={app.url}
            />
          ))}
        </ul>
      </div>
    );
  }
}

AccountTunnel.injectProps(AppsList, ["user"]);
