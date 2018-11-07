import * as cf from "@counterfactual/cf.js";
import lodash from "lodash";

import { InstructionExecutor } from "./instruction-executor";
import { OpCodeResult } from "./types";

/**
 * // TODO: this can still be named better
 * NodeState encapsulates the state of all the channels in the context of a node.
 * It is not named InstructionExecutorNodeState because the InstructionExecutor is
 * _only_ responsible for executing instructions and is inherently stateless.
 */
export class NodeState {
  public channelStates: cf.channel.ChannelStates;
  public networkContext: cf.utils.NetworkContext;

  constructor(
    channelStates: cf.channel.ChannelStates,
    network: cf.utils.NetworkContext
  ) {
    this.channelStates = channelStates;
    this.networkContext = network;
  }

  public stateChannel(multisig: cf.utils.Address): cf.channel.StateChannelInfo {
    return this.channelStates[multisig];
  }

  public stateChannelFromAddress(
    toAddress: cf.utils.Address
  ): cf.channel.StateChannelInfo {
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
  ): cf.channel.StateChannelInfo {
    const multisig = this.channelStates[multisigAddress];
    if (multisig) {
      return this.channelStates[multisigAddress];
    }
    throw Error(`Could not find multisig of address ${multisigAddress}`);
  }

  public app(
    multisig: cf.utils.Address,
    cfAddr: cf.utils.H256
  ): cf.app.AppInstanceInfo {
    return this.channelStates[multisig].appInstances[cfAddr];
  }

  public freeBalanceFromAddress(
    toAddress: cf.utils.Address
  ): cf.utils.FreeBalance {
    return this.stateChannelFromAddress(toAddress).freeBalance;
  }

  public freeBalanceFromMultisigAddress(
    multisigAddress: cf.utils.Address
  ): cf.utils.FreeBalance {
    const multisig = this.channelStates[multisigAddress];
    if (multisig) {
      return this.channelStates[multisigAddress].freeBalance;
    }
    throw Error(`Could not find multisig of address ${multisigAddress}`);
  }

  /**
   * @returns a deep copy of the StateChannelInfos.
   */
  public stateChannelInfosCopy(): cf.channel.StateChannelInfos {
    return cf.utils.serializer.deserialize(lodash.cloneDeep(this.channelStates));
  }

  public appChannelInfos(): cf.app.AppInstanceInfos {
    const infos = {};
    for (const channel of lodash.keys(this.channelStates)) {
      for (const appChannel of lodash.keys(
        this.channelStates[channel].appInstances
      )) {
        infos[appChannel] = this.channelStates[channel].appInstances[
          appChannel
        ];
      }
    }
    return infos;
  }
}

export class StateChannelInfoImpl implements cf.channel.StateChannelInfo {
  constructor(
    readonly counterParty: cf.utils.Address,
    readonly me: cf.utils.Address,
    readonly multisigAddress: cf.utils.Address,
    readonly appInstances: cf.app.AppInstanceInfos = {},
    readonly freeBalance: cf.utils.FreeBalance
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
  public instructionExecutor: InstructionExecutor = Object.create(null);
}
