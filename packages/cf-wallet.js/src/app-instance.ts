import {
  Address,
  AppABIEncodings,
  AppInstanceInfo,
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

  constructor(info: AppInstanceInfo, readonly provider: Provider) {
    this.identityHash = info.identityHash;
    this.appDefinition = info.appDefinition;
    this.abiEncodings = info.abiEncodings;
    this.myDeposit = info.myDeposit;
    this.peerDeposit = info.peerDeposit;
    this.timeout = info.timeout;
    this.twoPartyOutcomeInterpreterParams =
      info.twoPartyOutcomeInterpreterParams;
    this.coinTransferInterpreterParams = info.coinTransferInterpreterParams;
    this.intermediaries = info.intermediaries;
  }

  /**
   * Whether this app is virtual i.e. installation was routed through intermediaries
   */
  get isVirtual(): boolean {
    return Array.isArray(this.intermediaries) && this.intermediaries.length > 0;
  }
}
