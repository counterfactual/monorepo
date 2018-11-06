import * as cf from "@counterfactual/cf.js";
import lodash from "lodash";

import { CfFreeBalance } from "./middleware/cf-operation/types";
import { deserialize } from "./serializer";
import {
  AppInstanceInfo,
  AppInstanceInfos,
  ChannelStates,
  OpCodeResult,
  StateChannelInfo,
  StateChannelInfos
} from "./types";
import { CounterfactualVM } from "./vm";

export class CfState {
  public channelStates: ChannelStates;
  public networkContext: cf.utils.NetworkContext;

  constructor(channelStates: ChannelStates, network: cf.utils.NetworkContext) {
    this.channelStates = channelStates;
    this.networkContext = network;
  }

  public stateChannel(multisig: cf.utils.Address): StateChannelInfo {
    return this.channelStates[multisig];
  }

  public stateChannelFromAddress(
    toAddress: cf.utils.Address
  ): StateChannelInfo {
    const multisig = lodash.keys(this.channelStates).find(ms => {
      return this.channelStates[ms].me === toAddress;
    });

    if (multisig) {
      return this.channelStates[multisig];
    }
    throw Error(`Could not find multisig for address ${toAddress}`);
  }

  public stateChannelFromMultisigAddress(
    multisigAddress: cf.utils.Address
  ): StateChannelInfo {
    const multisig = this.channelStates[multisigAddress];
    if (multisig) {
      return this.channelStates[multisigAddress];
    }
    throw Error(`Could not find multisig of address ${multisigAddress}`);
  }

  public app(
    multisig: cf.utils.Address,
    cfAddr: cf.utils.H256
  ): AppInstanceInfo {
    return this.channelStates[multisig].appChannels[cfAddr];
  }

  public freeBalanceFromAddress(toAddress: cf.utils.Address): CfFreeBalance {
    return this.stateChannelFromAddress(toAddress).freeBalance;
  }

  public freeBalanceFromMultisigAddress(
    multisigAddress: cf.utils.Address
  ): CfFreeBalance {
    const multisig = this.channelStates[multisigAddress];
    if (multisig) {
      return this.channelStates[multisigAddress].freeBalance;
    }
    throw Error(`Could not find multisig of address ${multisigAddress}`);
  }

  /**
   * @returns a deep copy of the StateChannelInfos.
   */
  public stateChannelInfosCopy(): StateChannelInfos {
    return deserialize(lodash.cloneDeep(this.channelStates));
  }

  public appChannelInfos(): AppInstanceInfos {
    const infos = {};
    for (const channel of lodash.keys(this.channelStates)) {
      for (const appChannel of lodash.keys(
        this.channelStates[channel].appChannels
      )) {
        infos[appChannel] = this.channelStates[channel].appChannels[appChannel];
      }
    }
    return infos;
  }
}

export class StateChannelInfoImpl implements StateChannelInfo {
  constructor(
    readonly counterParty: cf.utils.Address,
    readonly me: cf.utils.Address,
    readonly multisigAddress: cf.utils.Address,
    readonly appChannels: AppInstanceInfos = {},
    readonly freeBalance: CfFreeBalance
  ) {}

  /**
   * @returns the toAddress, fromAddress in alphabetical order.
   */
  public owners(): string[] {
    return [this.counterParty, this.me].sort((a, b) => (a < b ? -1 : 1));
  }
}

export class Context {
  public results: OpCodeResult[] = Object.create(null);
  public instructionPointer: number = Object.create(null);
  public vm: CounterfactualVM = Object.create(null);
}
