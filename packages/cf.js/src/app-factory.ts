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
import { CounterfactualEvent, EventType } from "./types";

interface ProposeInstallParams {
  peerAddress: Address;
  asset: BlockchainAsset;
  myDeposit: ethers.utils.BigNumberish;
  peerDeposit: ethers.utils.BigNumberish;
  timeout: ethers.utils.BigNumberish;
  initialState: AppState;
}

function createInvalidParamError(
  val: any,
  paramName: string,
  originalError: any
): CounterfactualEvent {
  return {
    type: EventType.ERROR,
    data: {
      errorName: "invalid_param",
      message: `Invalid value for parameter '${paramName}': ${val}`,
      extra: {
        paramName,
        originalError
      }
    }
  };
}

function parseBigNumber(
  val: ethers.utils.BigNumberish,
  paramName: string
): ethers.utils.BigNumber {
  try {
    return new ethers.utils.BigNumber(val);
  } catch (e) {
    throw createInvalidParamError(val, paramName, e);
  }
}

export class AppFactory {
  constructor(
    readonly appId: Address,
    readonly encodings: AppABIEncodings,
    readonly provider: Provider
  ) {}

  async proposeInstall(params: ProposeInstallParams): Promise<AppInstanceID> {
    const timeout = parseBigNumber(params.timeout, "timeout");
    const myDeposit = parseBigNumber(params.myDeposit, "myDeposit");
    const peerDeposit = parseBigNumber(params.peerDeposit, "peerDeposit");
    try {
      ethers.utils.getAddress(params.peerAddress);
    } catch (e) {
      throw createInvalidParamError(params.peerAddress, "peerAddress", e);
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
