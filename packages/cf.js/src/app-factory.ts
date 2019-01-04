import {
  Address,
  AppABIEncodings,
  AppInstanceID,
  AppState,
  BlockchainAsset,
  Node
} from "@counterfactual/types";
import { BigNumber, BigNumberish } from "ethers/utils";

import { Provider } from "./provider";
import { EventType } from "./types";

interface ProposeInstallParams {
  peerAddress: Address;
  asset: BlockchainAsset;
  myDeposit: BigNumberish;
  peerDeposit: BigNumberish;
  timeout: BigNumberish;
  initialState: AppState;
}

interface ProposeInstallVirtualParams {
  peerAddress: Address;
  asset: BlockchainAsset;
  myDeposit: BigNumberish;
  peerDeposit: BigNumberish;
  timeout: BigNumberish;
  initialState: AppState;
  intermediaries: Address[];
}

function parseBigNumber(val: BigNumberish, paramName: string): BigNumber {
  try {
    return new BigNumber(val);
  } catch (e) {
    throw {
      type: EventType.ERROR,
      data: {
        errorName: "invalid_param",
        message: `Invalid value for parameter '${paramName}': ${val}`,
        extra: {
          paramName,
          originalError: e
        }
      }
    };
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

  async proposeInstallVirtual(
    params: ProposeInstallVirtualParams
  ): Promise<AppInstanceID> {
    const timeout = parseBigNumber(params.timeout, "timeout");
    const myDeposit = parseBigNumber(params.myDeposit, "myDeposit");
    const peerDeposit = parseBigNumber(params.peerDeposit, "peerDeposit");

    const response = await this.provider.callRawNodeMethod(
      Node.MethodName.PROPOSE_INSTALL_VIRTUAL,
      {
        timeout,
        peerDeposit,
        myDeposit,
        asset: params.asset,
        peerAddress: params.peerAddress,
        initialState: params.initialState,
        intermediaries: params.intermediaries,
        appId: this.appId,
        abiEncodings: this.encodings
      }
    );
    const {
      appInstanceId
    } = response.result as Node.ProposeInstallVirtualResult;
    return appInstanceId;
  }
}
