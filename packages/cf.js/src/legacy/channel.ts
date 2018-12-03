import { AppInstanceInfos } from "./app";

import { Address, FreeBalance } from "./utils";

export interface StateChannelInfo {
  counterParty: Address;
  me: Address;
  multisigAddress: Address;
  appInstances: AppInstanceInfos;
  freeBalance: FreeBalance;

  // TODO: Move this out of the datastructure
  // https://github.com/counterfactual/monorepo/issues/127
  /**
   * @returns the addresses of the owners of this state channel sorted
   *          in alphabetical order.
   */
  owners(): string[];
}

// a mapping from multisig address to a StateChannelInfo struct containing
// details about the channel associated with that multisig
export interface StateChannelInfos {
  [s: string]: StateChannelInfo;
}
