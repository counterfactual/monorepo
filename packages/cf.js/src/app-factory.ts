import {
  Address,
  AppABIEncodings,
  AppState,
  BlockchainAsset,
  Node
} from "@counterfactual/common-types";
import { BigNumber, BigNumberish } from "ethers/utils";

import { AppInstance } from "./app-instance";
import { Provider } from "./provider";

interface ProposeInstallParams {
  peerAddress: Address;
  asset: BlockchainAsset;
  myDeposit: BigNumberish;
  peerDeposit: BigNumberish;
  timeout: BigNumberish;
  initialState: AppState;
}

export class AppFactory {
  constructor(
    readonly provider: Provider,
    readonly appId: Address,
    readonly encodings: AppABIEncodings
  ) {}

  async proposeInstall(params: ProposeInstallParams): Promise<AppInstance> {
    const timeout = new BigNumber(params.timeout);
    const myDeposit = new BigNumber(params.myDeposit);
    const peerDeposit = new BigNumber(params.peerDeposit);
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
    return this.provider.getOrCreateAppInstance(appInstanceId);
  }
}
