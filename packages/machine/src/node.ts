import * as cf from "@counterfactual/cf.js";

/**
 * Node encapsulates the state of all the channels.
 */
export class Node {
  public channelStates: cf.legacy.channel.StateChannelInfos;
  public networkContext: cf.legacy.network.NetworkContext;

  constructor(
    channelStates: cf.legacy.channel.StateChannelInfos,
    network: cf.legacy.network.NetworkContext
  ) {
    this.channelStates = channelStates;
    this.networkContext = network;
  }

  public stateChannel(
    multisig: cf.legacy.utils.Address
  ): cf.legacy.channel.StateChannelInfo {
    return this.channelStates[multisig];
  }

  public stateChannelFromMultisigAddress(
    multisigAddress: cf.legacy.utils.Address
  ): cf.legacy.channel.StateChannelInfo {
    const multisig = this.channelStates[multisigAddress];
    if (multisig) {
      return this.channelStates[multisigAddress];
    }
    throw Error(`Could not find multisig of address ${multisigAddress}`);
  }

  public app(
    multisig: cf.legacy.utils.Address,
    cfAddr: cf.legacy.utils.H256
  ): cf.legacy.app.AppInstanceInfo {
    return this.channelStates[multisig].appInstances[cfAddr];
  }

  public freeBalanceFromMultisigAddress(
    multisigAddress: cf.legacy.utils.Address
  ): cf.legacy.utils.FreeBalance {
    const multisig = this.channelStates[multisigAddress];
    if (multisig) {
      return this.channelStates[multisigAddress].freeBalance;
    }
    throw Error(`Could not find multisig of address ${multisigAddress}`);
  }

  /**
   * @returns a deep copy of the StateChannelInfos.
   */
  public stateChannelInfosCopy(): cf.legacy.channel.StateChannelInfos {
    return cf.legacy.utils.serializer.deserialize(
      JSON.parse(JSON.stringify(this.channelStates))
    );
  }

  public appChannelInfos(): cf.legacy.app.AppInstanceInfos {
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

export class StateChannelInfoImpl
  implements cf.legacy.channel.StateChannelInfo {
  constructor(
    readonly counterParty: cf.legacy.utils.Address,
    readonly me: cf.legacy.utils.Address,
    readonly multisigAddress: cf.legacy.utils.Address,
    readonly appInstances: cf.legacy.app.AppInstanceInfos = {},
    readonly freeBalance: cf.legacy.utils.FreeBalance
  ) {}

  /**
   * @returns the toAddress, fromAddress in alphabetical order.
   */
  public owners(): string[] {
    return [this.counterParty, this.me].sort((a, b) => (a < b ? -1 : 1));
  }
}
