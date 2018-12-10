import { legacy } from "@counterfactual/cf.js";
import {
  Address,
  AppInstanceInfo,
  AssetType,
  Node
} from "@counterfactual/common-types";
import { ethers } from "ethers";

import { IStoreService } from "./service-interfaces";

/**
 * The schema of a channel is below.
 * The following Channels class encapsulates the state and persistence of all
 * the channels in a Node.
 */

/**
 * The fully expanded schema for a channel:
 * multisigAddress: {
 *  multisigAddress: Address,
 *  multisigOwners: Address[],
 *  appsNonce: Nonce,
 *  appInstances: Map<AppInstanceID,
 *    appInstance: {
 *      id: string,
 *      appId: Address,
 *      abiEncodings: {
 *        stateEncoding: string,
 *        actionEncoding: string
 *      },
 *      appState: any,
 *      localNonce: Nonce,
 *      timeout: BigNumber,
 *      asset: {
 *        assetType: AssetType,
 *        limit: BigNumber
 *        token?: Address
 *      },
 *      deposits: Map<Address, BigNumber>
 *    }
 *  },
 *  freeBalances: Map<AssetType,
 *    freeBalance: {
 *      alice: Address,
 *      aliceBalance: BigNumber,
 *      bob: Address,
 *      bobBalance: BigNumber,
 *      uniqueId: number,
 *      localNonce: number,
 *      timeout: number,
 *      dependencyNonce: {
 *        isSet: boolean,
 *        salt: string,
 *        nonceValue: number
 *      }
 *    }
 *  }
 * }
 */

/**
 * This class is only a type implementation of a channel schema for the
 * purposes of storing and retrieving a channel's state for the store.
 */
class Channel {
  constructor(
    readonly multisigAddress: Address,
    readonly multisigOwners: Address[],
    readonly appsNonce?: legacy.utils.Nonce,
    readonly appInstances?: Map<string, AppInstanceInfo>,
    readonly freeBalances?: Map<AssetType, legacy.utils.FreeBalance>
  ) {
    if (!this.appsNonce) {
      this.appsNonce = new legacy.utils.Nonce(true, 0, 0);
    }

    if (!this.freeBalances) {
      this.freeBalances = new Map<AssetType, legacy.utils.FreeBalance>();
      // TODO: extend to all asset types
      this.freeBalances[AssetType.ETH] = new legacy.utils.FreeBalance(
        this.multisigOwners[0],
        ethers.utils.bigNumberify("0"),
        this.multisigOwners[1],
        ethers.utils.bigNumberify("0"),
        0,
        0,
        0,
        this.appsNonce
      );
    }

    if (!this.appInstances) {
      this.appInstances = new Map<string, AppInstanceInfo>();
    }
  }
}

/**
 * Note: this class itelf does not hold any state. It encapsulates the operations
 * performed on relevant appInstances and abstracts the persistence to the
 * store service.
 */
export class Channels {
  /**
   * A convenience struct to lookup multisig address from a set of owners.
   */
  // @ts-ignore
  private readonly ownersToMultisigAddress = new Map<Address[], Address>();

  /**
   * @param address The address of the account being used with the Node.
   * @param store
   * @param multisigKeyPrefix The prefix to add to the key being used
   *        for indexing multisig addresses according to the execution
   *        environment.
   */
  constructor(
    // @ts-ignore
    private readonly address: Address,
    private readonly store: IStoreService,
    private readonly multisigKeyPrefix: string
  ) {}

  /**
   * Called when a new multisig is created for a set of owners.
   * @param multisigAddress
   * @param multisigOwners
   * @param freeBalances
   */
  async createMultisig(params: Node.CreateMultisigParams): Promise<Address> {
    const multisigAddress = Channels.getMultisigAddress(params.owners);
    const channel: Channel = new Channel(multisigAddress, params.owners);
    await this.store.set(
      `${this.multisigKeyPrefix}/${multisigAddress}`,
      channel
    );
    return multisigAddress;
  }

  // private async getChannel(peerAddress: Address): Promise<Channel> {
  //   const owners = Channels.canonicalizeAddresses([this.address, peerAddress]);
  //   if (!this.ownersToMultisigAddress.has(owners)) {
  //     throw Error(`No channel exists with the specified peer: ${peerAddress}`);
  //   }
  //   const multisigAddress = this.ownersToMultisigAddress.get(
  //     Channels.canonicalizeAddresses([this.address, peerAddress])
  //   )!;
  //   const channel = await this.store.get(
  //     `${this.multisigKeyPrefix}/${multisigAddress}`
  //   );
  //   return channel as any;
  // }

  private async getAllChannels(): Promise<object> {
    const channels = await this.store.get(this.multisigKeyPrefix);
    if (!channels) {
      console.log("No channels exist yet");
      return {};
    }
    return channels;
  }

  async getAllApps(): Promise<AppInstanceInfo[]> {
    const apps: AppInstanceInfo[] = [];
    const channels = await this.getAllChannels();
    Object.values(channels).forEach((channel: Channel) => {
      if (channel.appInstances) {
        apps.push(...channel.appInstances.values());
      }
    });
    return apps;
  }

  async proposeInstall(params: Node.ProposeInstallParams): Promise<string> {
    // const channel = this.getChannel(params.peerAddress);
    // TODO: generate unique ID for the proposed app
    return "1";
  }

  // Utility methods

  static canonicalizeAddresses(addresses: Address[]): Address[] {
    addresses.sort((addrA: Address, addrB: Address) => {
      return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
    });
    return addresses;
  }

  static getMultisigAddress(owners: Address[]): Address {
    // TODO: implement this using CREATE2
    return ethers.Wallet.createRandom().address;
  }
}
