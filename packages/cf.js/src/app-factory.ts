import {
  Address,
  AppABIEncodings,
  AppInstanceID,
  BlockchainAsset,
  Node,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { BigNumber, BigNumberish } from "ethers/utils";

import { Provider } from "./provider";
import { EventType } from "./types";

/**
 * @ignore
 */
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

/**
 * Proposes installations of a given app
 */
export class AppFactory {
  /**
   * Constructs a new instance
   * @param appId Address of the on-chain contract containing the app logic.
   * @param encodings ABI encodings to encode and decode the app's state and actions
   * @param provider CFjs provider
   */
  constructor(
    readonly appId: Address,
    readonly encodings: AppABIEncodings,
    readonly provider: Provider
  ) {}

  /**
   * Propose installation of a non-virtual app instance i.e. installed in direct channel between you and peer
   *
   * @async
   * @param params Proposal parameters
   * @return ID of proposed app instance
   */
  async proposeInstall(params: {
    /** Xpub of peer being proposed to install instance with */
    proposedToIdentifier: string;
    /** Asset to use for deposit */
    asset: BlockchainAsset;
    /** Amount to be deposited by you */
    myDeposit: BigNumberish;
    /** Amount to be deposited by peer */
    peerDeposit: BigNumberish;
    /** Number of blocks until an on-chain submitted state is considered final */
    timeout: BigNumberish;
    /** Initial state of app instance */
    initialState: SolidityABIEncoderV2Type;
  }): Promise<AppInstanceID> {
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
        proposedToIdentifier: params.proposedToIdentifier,
        initialState: params.initialState,
        appId: this.appId,
        abiEncodings: this.encodings
      }
    );
    const { appInstanceId } = response.result as Node.ProposeInstallResult;
    return appInstanceId;
  }

  /**
   * Propose installation of a virtual app instance i.e. routed through at least one intermediary node
   *
   * @async
   * @param params Proposal parameters
   * @return ID of proposed app instance
   */
  async proposeInstallVirtual(params: {
    /** Xpub of peer being proposed to install instance with */
    proposedToIdentifier: string;
    /** Asset to use for deposit */
    asset: BlockchainAsset;
    /** Amount to be deposited by you */
    myDeposit: BigNumberish;
    /** Amount to be deposited by peer */
    peerDeposit: BigNumberish;
    /** Number of blocks until an on-chain submitted state is considered final */
    timeout: BigNumberish;
    /** Initial state of app instance */
    initialState: SolidityABIEncoderV2Type;
    /** List of intermediary peers to route installation through */
    intermediaries: string[];
  }): Promise<AppInstanceID> {
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
        proposedToIdentifier: params.proposedToIdentifier,
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
