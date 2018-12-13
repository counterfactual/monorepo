import { AppInstanceInfos } from "./app";

import { Address, FreeBalance } from "./utils";

export interface StateChannelInfo {
  counterParty: Address;
  me: Address;
  multisigAddress: Address;
  appInstances: AppInstanceInfos;
  freeBalance: FreeBalance;
}

// a mapping from multisig address to a StateChannelInfo struct containing
// details about the channel associated with that multisig
export interface StateChannelInfos {
  [s: string]: StateChannelInfo;
}
