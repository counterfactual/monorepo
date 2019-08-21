import {
  AppABIEncodings,
  Node,
  OutcomeType,
  SolidityValueType
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
   * @param appDefinition Address of the on-chain contract containing the app logic.
   * @param encodings ABI encodings to encode and decode the app's state and actions
   * @param provider CFjs provider
   */
  constructor(
    readonly appDefinition: string,
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
    /** Amount to be deposited by you */
    initiatorDeposit: BigNumberish;
    /** Amount to be deposited by peer */
    responderDeposit: BigNumberish;
    /** Number of blocks until an on-chain submitted state is considered final */
    timeout: BigNumberish;
    /** Initial state of app instance */
    initialState: SolidityValueType;
    /** The outcome type of the app instance */
    outcomeType: OutcomeType;
  }): Promise<string> {
    const timeout = parseBigNumber(params.timeout, "timeout");
    const initiatorDeposit = parseBigNumber(
      params.initiatorDeposit,
      "initiatorDeposit"
    );
    const responderDeposit = parseBigNumber(
      params.responderDeposit,
      "responderDeposit"
    );

    const response = await this.provider.callRawNodeMethod(
      Node.RpcMethodName.PROPOSE_INSTALL,
      {
        timeout,
        responderDeposit,
        initiatorDeposit,
        proposedToIdentifier: params.proposedToIdentifier,
        initialState: params.initialState,
        appDefinition: this.appDefinition,
        abiEncodings: this.encodings,
        outcomeType: params.outcomeType
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
    /** xpub of peer being proposed to install instance with */
    proposedToIdentifier: string;
    /** Amount to be deposited by you */
    initiatorDeposit: BigNumberish;
    /** Amount to be deposited by peer */
    responderDeposit: BigNumberish;
    /** Number of blocks until an on-chain submitted state is considered final */
    timeout: BigNumberish;
    /** Initial state of app instance */
    initialState: SolidityValueType;
    /** Intermediary peer to route installation through */
    intermediaryIdentifier: string;
  }): Promise<string> {
    const timeout = parseBigNumber(params.timeout, "timeout");
    const initiatorDeposit = parseBigNumber(
      params.initiatorDeposit,
      "initiatorDeposit"
    );
    const responderDeposit = parseBigNumber(
      params.responderDeposit,
      "responderDeposit"
    );

    const response = await this.provider.callRawNodeMethod(
      Node.RpcMethodName.PROPOSE_INSTALL_VIRTUAL,
      {
        timeout,
        responderDeposit,
        initiatorDeposit,
        proposedToIdentifier: params.proposedToIdentifier,
        initialState: params.initialState,
        intermediaryIdentifier: params.intermediaryIdentifier,
        appDefinition: this.appDefinition,
        abiEncodings: this.encodings,
        // FIXME: Hard-coded temporarily
        outcomeType: OutcomeType.TWO_PARTY_FIXED_OUTCOME
      }
    );
    const {
      appInstanceId
    } = response.result as Node.ProposeInstallVirtualResult;
    return appInstanceId;
  }
}
