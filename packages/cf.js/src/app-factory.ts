import {
  Address,
  AppABIEncodings,
  AppInstanceID,
  AppState,
  BlockchainAsset,
  Node
} from "@counterfactual/common-types";
import { ethers } from "ethers";

import { Provider } from "./provider";
import { EventType } from "./types";

interface ProposeInstallParams {
  peerAddress: Address;
  asset: BlockchainAsset;
  myDeposit: ethers.utils.BigNumberish;
  peerDeposit: ethers.utils.BigNumberish;
  timeout: ethers.utils.BigNumberish;
  initialState: AppState;
}

export class AppFactory {
  constructor(
    readonly appId: Address,
    readonly encodings: AppABIEncodings,
    readonly provider: Provider
  ) {}

  async proposeInstall(params: ProposeInstallParams): Promise<AppInstanceID> {
    const timeout = new ethers.utils.BigNumber(params.timeout);
    const myDeposit = new ethers.utils.BigNumber(params.myDeposit);
    const peerDeposit = new ethers.utils.BigNumber(params.peerDeposit);
    try {
      ethers.utils.getAddress(params.peerAddress);
    } catch (e) {
      if (e.code === "INVALID_ARGUMENT") {
        throw {
          type: EventType.ERROR,
          data: {
            errorName: "invalid_peer_address",
            message: `Invalid peer address for install proposal: ${
              params.peerAddress
            }`
          }
        };
      }
    }
    const nodeParams: Node.ProposeInstallParams = {
      timeout,
      peerDeposit,
      myDeposit,
      asset: params.asset,
      peerAddress: params.peerAddress,
      initialState: params.initialState,
      appId: this.appId,
      abiEncodings: this.encodings
    };
    const response = await this.provider.callRawNodeMethod(
      Node.MethodName.PROPOSE_INSTALL,
      nodeParams
    );
    const { appInstanceId } = response.result as Node.ProposeInstallResult;
    return appInstanceId;
  }
}
