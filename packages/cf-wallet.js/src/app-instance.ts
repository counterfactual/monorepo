import {
  AppABIEncodings,
  AppInstanceInfo,
  AppInstanceJson,
  MultiAssetMultiPartyCoinTransferInterpreterParams,
  TwoPartyFixedOutcomeInterpreterParams
} from "@counterfactual/types";
import { BigNumber, bigNumberify } from "ethers/utils";

import { Provider } from "./provider";

/**
 * Represents an installed app instance
 */
export class AppInstance {
  /**
   * Unique ID of this app instance.
   */
  readonly identityHash: string;

  // Application-specific fields
  readonly appDefinition: string;
  readonly abiEncodings: AppABIEncodings;
  readonly timeout: BigNumber;

  // Funding-related fields
  readonly initiatorDeposit: BigNumber;
  readonly responderDeposit: BigNumber;

  readonly twoPartyOutcomeInterpreterParams?: TwoPartyFixedOutcomeInterpreterParams;
  readonly multiAssetMultiPartyCoinTransferInterpreterParams?: MultiAssetMultiPartyCoinTransferInterpreterParams;

  readonly intermediaryIdentifier?: string;

  constructor(
    info: AppInstanceInfo | AppInstanceJson,
    readonly provider: Provider
  ) {
    this.identityHash = info.identityHash;

    if ("appInterface" in info) {
      const { appInterface, defaultTimeout } = <AppInstanceJson>info;
      this.appDefinition = appInterface.addr;
      this.abiEncodings = {
        stateEncoding: appInterface.stateEncoding,
        actionEncoding: appInterface.actionEncoding
      };
      this.timeout = bigNumberify(defaultTimeout);
    } else {
      const { appDefinition, abiEncodings, timeout } = <AppInstanceInfo>info;
      this.appDefinition = appDefinition;
      this.abiEncodings = abiEncodings;
      this.timeout = timeout;
    }

    this.initiatorDeposit = info["initiatorDeposit"];
    this.responderDeposit = info["responderDeposit"];
    this.intermediaryIdentifier = info["intermediaryIdentifier"];
  }

  /**
   * Whether this app is virtual i.e. installation was routed through intermediaryIdentifier
   */
  get isVirtual(): boolean {
    return !!this.intermediaryIdentifier;
  }
}
