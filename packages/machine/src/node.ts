import { legacy } from "@counterfactual/cf.js";

/**
 * Node encapsulates the state of all the channels.
 */
export class Node {
  constructor(
    readonly channelStates: legacy.channel.StateChannelInfos,
    readonly networkContext: any
  ) {}

  public stateChannel(
    multisig: legacy.utils.Address
  ): legacy.channel.StateChannelInfo {
    return this.channelStates[multisig];
  }

  public stateChannelFromMultisigAddress(
    multisigAddress: legacy.utils.Address
  ): legacy.channel.StateChannelInfo {
    const multisig = this.channelStates[multisigAddress];
    if (multisig) {
      return this.channelStates[multisigAddress];
    }
    throw Error(`Could not find multisig of address ${multisigAddress}`);
  }

  public app(
    multisig: legacy.utils.Address,
    cfAddr: legacy.utils.H256
  ): legacy.app.AppInstanceInfo {
    return this.channelStates[multisig].appInstances[cfAddr];
  }

  public freeBalanceFromMultisigAddress(
    multisigAddress: legacy.utils.Address
  ): legacy.utils.FreeBalance {
    const multisig = this.channelStates[multisigAddress];
    if (multisig) {
      return this.channelStates[multisigAddress].freeBalance;
    }
    throw Error(`Could not find multisig of address ${multisigAddress}`);
  }

  /**
   * @returns a deep copy of the StateChannelInfos.
   */
  public stateChannelInfosCopy(): legacy.channel.StateChannelInfos {
    return legacy.utils.serializer.deserialize(
      JSON.parse(JSON.stringify(this.channelStates))
    );
  }

  public appChannelInfos(): legacy.app.AppInstanceInfos {
    const infos = {};
    for (const channel of Object.keys(this.channelStates)) {
      for (const appChannel of Object.keys(
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

export class StateChannelInfoImpl implements legacy.channel.StateChannelInfo {
  constructor(
    readonly counterParty: legacy.utils.Address,
    readonly me: legacy.utils.Address,
    readonly multisigAddress: legacy.utils.Address,
    readonly appInstances: legacy.app.AppInstanceInfos = {},
    readonly freeBalance: legacy.utils.FreeBalance
  ) {}

  /**
   * @returns the toAddress, fromAddress in alphabetical order.
   */
  public owners(): string[] {
    return [this.counterParty, this.me].sort((a, b) => (a < b ? -1 : 1));
  }
}
