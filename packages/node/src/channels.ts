import { legacy } from "@counterfactual/cf.js";
import { Address, AppInstanceInfo, Node } from "@counterfactual/common-types";
import { ethers } from "ethers";

import { IStoreService } from "./service-interfaces";

type Channel = legacy.channel.StateChannelInfo;

/**
 * The schema for a channel is as follows:
 * [address: Address, peerAddress: Address]: {
 *   channelAddress: Address,
 * . appInstances: Map<AppInstanceID, {
 *     appInstance: AppInstanceInfo,
 *     commitments: Map<ProtocolName, Commitment>
 *   },
 * . freeBalance: FreeBalance,
 * }
 */
export class Channels {
  constructor(
    private readonly address: Address,
    private readonly store: IStoreService
  ) {}

  private getChannel(peerAddress: Address) {
    const channelJSON = this.store.get(
      canonicalizeAddressesKey([this.address, peerAddress])
    );
    // TODO: deserialize json
    return;
  }

  async getAllApps(): Promise<AppInstanceInfo[]> {
    const apps: AppInstanceInfo[] = [];
    const channels = await this.store.get("*");
    channels.forEach((channel: Channel, addresses: Address[]) => {
      const channelApps: legacy.app.AppInstanceInfos = channel.appInstances;
      console.log(channelApps);
    });
    return apps;
  }

  async proposeInstall(params: Node.ProposeInstallParams): Promise<string> {
    const channel = this.getChannel(params.peerAddress);
    // TODO: generate unique ID for the proposed app
    return "1";
  }
}

function canonicalizeAddresses(addresses: Address[]): Address[] {
  addresses.sort((addrA: Address, addrB: Address) => {
    return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
  });
  return addresses;
}

/**
 * This turns an array of addresses into a string to be used as a key,
 * and it assumes that exactly two addresses are in the array.
 * @param addresses
 */
function canonicalizeAddressesKey(addresses: Address[]): string {
  const canonicalAddresses = canonicalizeAddresses(addresses);
  return `${(canonicalAddresses[0], canonicalAddresses[1])}`;
}
