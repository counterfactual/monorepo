import {
  Address,
  AppABIEncodings,
  AppInstanceID,
  AppState,
  BlockchainAsset,
  Node
} from "@counterfactual/types";
import { BigNumber, BigNumberish, getAddress } from "ethers/utils";

import { Provider } from "./provider";
import { CounterfactualEvent, EventType } from "./types";

interface ProposeInstallParams {
  peerAddress: Address;
  asset: BlockchainAsset;
  myDeposit: BigNumberish;
  peerDeposit: BigNumberish;
  timeout: BigNumberish;
  initialState: AppState;
}

interface ProposeVirtualInstallParams {
  peerAddress: Address;
  asset: BlockchainAsset;
  myDeposit: BigNumberish;
  peerDeposit: BigNumberish;
  timeout: BigNumberish;
  initialState: AppState;
  intermediaries: Address[];
}

function createInvalidParamError(
  val: any,
  paramName: string,
  originalError?: any
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

function parseBigNumber(val: BigNumberish, paramName: string): BigNumber {
  try {
    return new BigNumber(val);
  } catch (e) {
    throw createInvalidParamError(val, paramName, e);
  }
}

function checkAddress(address: Address, paramName: string) {
  try {
    getAddress(address);
  } catch (e) {
    throw createInvalidParamError(address, paramName, e);
  }
}

function parseBigNumberParams(params: ProposeInstallParams) {
  const timeout = parseBigNumber(params.timeout, "timeout");
  const myDeposit = parseBigNumber(params.myDeposit, "myDeposit");
  const peerDeposit = parseBigNumber(params.peerDeposit, "peerDeposit");
  return { timeout, myDeposit, peerDeposit };
}

export class AppFactory {
  constructor(
    readonly appId: Address,
    readonly encodings: AppABIEncodings,
    readonly provider: Provider
  ) {}

  async proposeInstall(params: ProposeInstallParams): Promise<AppInstanceID> {
    const { timeout, myDeposit, peerDeposit } = parseBigNumberParams(params);
    checkAddress(params.peerAddress, "peerAddress");
    const response = await this.provider.callRawNodeMethod(
      Node.MethodName.PROPOSE_INSTALL,
      {
        timeout,
        peerDeposit,
        myDeposit,
        asset: params.asset,
        peerAddress: params.peerAddress,
        initialState: params.initialState,
        appId: this.appId,
        abiEncodings: this.encodings
      }
    );
    const { appInstanceId } = response.result as Node.ProposeInstallResult;
    return appInstanceId;
  }

  async proposeVirtualInstall(
    params: ProposeVirtualInstallParams
  ): Promise<AppInstanceID> {
    const { timeout, myDeposit, peerDeposit } = parseBigNumberParams(params);
    if (params.intermediaries.length === 0) {
      throw createInvalidParamError(params.intermediaries, "intermediaries");
    }
    checkAddress(params.peerAddress, "peerAddress");
    for (const address of params.intermediaries) {
      checkAddress(address, "intermediaries");
    }
    const response = await this.provider.callRawNodeMethod(
      Node.MethodName.PROPOSE_INSTALL,
      {
        timeout,
        peerDeposit,
        myDeposit,
        asset: params.asset,
        peerAddress: params.peerAddress,
        initialState: params.initialState,
        appId: this.appId,
        abiEncodings: this.encodings
      }
    );
    const {
      appInstanceId
    } = response.result as Node.ProposeVirtualInstallResult;
    return appInstanceId;
  }
}
