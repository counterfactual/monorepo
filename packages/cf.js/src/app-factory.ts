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
