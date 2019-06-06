import {
  Address,
  AppABIEncodings,
  AppInstanceID,
  AppInstanceInfo
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
  readonly id: AppInstanceID;

  readonly appDefinition: Address;
  readonly abiEncodings: AppABIEncodings;
  readonly myDeposit: BigNumber;
  readonly peerDeposit: BigNumber;
  readonly timeout: BigNumber;
  readonly intermediaries?: Address[];

  constructor(info: AppInstanceInfo, readonly provider: Provider) {
    this.id = info.id;
    this.appDefinition = info.appDefinition;
    this.abiEncodings = info.abiEncodings;
    this.myDeposit = info.myDeposit;
    this.peerDeposit = info.peerDeposit;
    this.timeout = info.timeout;
    this.intermediaries = info.intermediaries;
  }

  /**
   * Whether this app is virtual i.e. installation was routed through intermediaries
   */
  get isVirtual(): boolean {
    return Array.isArray(this.intermediaries) && this.intermediaries.length > 0;
  }
}
