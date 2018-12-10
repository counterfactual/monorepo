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
 *      dependencyNonce: Nonce,
 *      timeout: BigNumber,
 *      asset: {
 *        assetType: AssetType,
 *        limit: BigNumber
 *        token?: Address
 *      },
 *      deposits: Map<Address, BigNumber>
 *    }
 *  },
 *  proposedAppInstances: same schema as appInstances,
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
 * purposes of updating and retrieving a channel's state from the store.
 *
 * An instance is by itself stateless and effectively reflects the state of an
 * according channel in the store.
 */
class Channel {
  constructor(
    readonly multisigAddress: Address,
    readonly multisigOwners: Address[],
    readonly appsNonce?: legacy.utils.Nonce,
    readonly freeBalances?: Map<AssetType, legacy.utils.FreeBalance>,
    readonly appInstances?: Map<string, AppInstanceInfo>,
    readonly proposedAppInstances?: Map<string, AppInstanceInfo>
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
      // FIXME: firebase-specific nuance: without propering indexing, the field
      // doesn't get written in the object blob if the path specified at key
      // `appInstances` does not have any entries
      this.appInstances["init"] = {} as any;
    }
    if (!this.proposedAppInstances) {
      this.proposedAppInstances = new Map<string, AppInstanceInfo>();
      // FIXME: firebase-specific nuance: without propering indexing, the field
      // doesn't get written in the object blob if the path specified at key
      // `proposedAppInstances` does not have any entries
      this.proposedAppInstances["init"] = {} as any;
    }
  }

  toJson(): object {
    return {
      multisigAddress: this.multisigAddress,
      multisigOwners: this.multisigOwners,
      appsNonce: this.appsNonce,
      freeBalances: JSON.stringify([...this.freeBalances!]),
      appInstances: JSON.stringify([...this.appInstances!]),
      proposedAppInstances: JSON.stringify([...this.proposedAppInstances!])
    };
  }
}

/**
 * Note: this class itelf does not hold any meaningful state either.
 * It encapsulates the operations performed on relevant appInstances and
 * abstracts the persistence to the store service.
 */
export class Channels {
  /**
   * A convenience lookup table from a set of owners to multisig address.
   */
  private readonly ownersToMultisigAddress = {};

  /**
   * A convenience lookup table from appInstance ID to multisig address.
   */
  private readonly appInstanceIdToMultisigAddress = {};

  /**
   * @param address The address of the account being used with the Node.
   * @param store
   * @param multisigKeyPrefix The prefix to add to the key being used
   *        for indexing multisig addresses according to the execution
   *        environment.
   */
  constructor(
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
    const ownersHash = Channels.canonicalizeAddresses(params.owners);
    this.ownersToMultisigAddress[ownersHash] = multisigAddress;
    this.save(channel);
    return multisigAddress;
  }

  /**
   * Returns a JSON object with the keys being the multisig addresses and the
   * values being objects reflecting the channel schema described above.
   */
  private async getAllChannels(): Promise<object> {
    const channels = await this.store.get(this.multisigKeyPrefix);
    if (!channels) {
      console.log("No channels exist yet");
      return {};
    }
    return channels;
  }

  private async getChannelFromPeerAddress(
    peerAddress: Address
  ): Promise<Channel> {
    const owners = Channels.canonicalizeAddresses([this.address, peerAddress]);
    const multisigAddress = this.ownersToMultisigAddress[owners];
    const channel = await this.store.get(
      `${this.multisigKeyPrefix}/${multisigAddress}`
    );
    return new Channel(
      channel.multisigAddress,
      channel.multisigOwners,
      channel.appsNonce,
      new Map(JSON.parse(channel.freeBalances)),
      new Map(JSON.parse(channel.appInstances)),
      new Map(JSON.parse(channel.proposedAppInstances))
    );
  }

  private async getChannelFromAppInstanceId(
    appInstanceId: string
  ): Promise<Channel> {
    const multisigAddress = this.appInstanceIdToMultisigAddress[appInstanceId];
    const channel = await this.store.get(
      `${this.multisigKeyPrefix}/${multisigAddress}`
    );
    return new Channel(
      channel.multisigAddress,
      channel.multisigOwners,
      channel.appsNonce,
      channel.freeBalances,
      channel.appInstances,
      channel.proposedAppInstances
    );
  }

  /**
   * Gets all appInstances across all of the channels open on this Node.
   */
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
    const channel = await this.getChannelFromPeerAddress(params.peerAddress);
    console.log("got channel: ", channel);
    // TODO: generate the id correctly
    const appInstanceId = channel.appsNonce!.nonceValue.toString();
    const appInstance: AppInstanceInfo = { id: appInstanceId, ...params };
    await this.addProposal(channel, appInstance);
    this.appInstanceIdToMultisigAddress[appInstanceId] =
      channel.multisigAddress;
    return appInstanceId;
  }

  async install(params: Node.InstallParams): Promise<AppInstanceInfo> {
    const channel = await this.getChannelFromAppInstanceId(
      params.appInstanceId
    );
    console.log("getting channel to install: ", channel);
    const appInstance: AppInstanceInfo = channel.proposedAppInstances![
      params.appInstanceId
    ];
    channel.proposedAppInstances!.delete(params.appInstanceId);
    channel.appInstances!.set(params.appInstanceId, appInstance);
    console.log("state of channel: ", channel);
    return appInstance;
  }

  // Methods for persisting changes to a channel

  async save(channel: Channel) {
    await this.store.set(
      `${this.multisigKeyPrefix}/${channel.multisigAddress}`,
      channel.toJson()
    );
  }

  async addProposal(channel: Channel, appInstance: AppInstanceInfo) {
    console.log("adding proposal: ", channel);
    channel.proposedAppInstances!.set(appInstance.id, appInstance);
    console.log("writing to channel: ", channel);
    await this.store.set(
      `${this.multisigKeyPrefix}/${
        channel.multisigAddress
      }/proposedAppInstances`,
      JSON.stringify([...channel.proposedAppInstances!])
    );
  }

  // Utility methods

  static canonicalizeAddresses(addresses: Address[]): string {
    addresses.sort((addrA: Address, addrB: Address) => {
      return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
    });
    return ethers.utils.hashMessage(addresses.join(""));
  }

  static getMultisigAddress(owners: Address[]): Address {
    // TODO: implement this using CREATE2
    return ethers.Wallet.createRandom().address;
  }
}
