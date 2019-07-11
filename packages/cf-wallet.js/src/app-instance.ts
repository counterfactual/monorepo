import {
  Address,
  AppABIEncodings,
  AppInstanceInfo,
  AppInstanceJson,
  CoinTransferInterpreterParams,
  TwoPartyFixedOutcomeInterpreterParams
} from "@counterfactual/types";
import { BigNumber } from "ethers/utils";

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
  readonly appDefinition: Address;
  readonly abiEncodings: AppABIEncodings;
  readonly timeout: BigNumber;

  // Funding-related fields
  readonly myDeposit: BigNumber;
  readonly peerDeposit: BigNumber;

  readonly twoPartyOutcomeInterpreterParams?: TwoPartyFixedOutcomeInterpreterParams;
  readonly coinTransferInterpreterParams?: CoinTransferInterpreterParams;

  readonly intermediaries?: Address[];

  constructor(
    info: AppInstanceInfo | AppInstanceJson,
    readonly provider: Provider
  ) {
    this.identityHash = info.identityHash;

    if (info["appInterface"] !== undefined) {
      this.appDefinition = info["appInterface"].addr;
      this.abiEncodings = {
        stateEncoding: info["appInterface"].stateEncoding,
        actionEncoding: info["appInterface"].actionEncoding
      };
      this.timeout = info["defaultTimeout"];
    } else {
      this.appDefinition = info["appDefinition"];
      this.abiEncodings = info["abiEncodings"];
      this.timeout = info["timeout"];
    }

    this.myDeposit = info["myDeposit"];
    this.peerDeposit = info["peerDeposit"];
    this.intermediaries = info["intermediaries"];
  }

  /**
   * Whether this app is virtual i.e. installation was routed through intermediaries
   */
  get isVirtual(): boolean {
    return Array.isArray(this.intermediaries) && this.intermediaries.length > 0;
  }
}
