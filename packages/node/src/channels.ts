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
 */
class Channel {
  public appInstances: Map<string, AppInstanceInfo> = new Map();
  public proposedAppInstances: Map<string, AppInstanceInfo> = new Map();

  constructor(
    public multisigKeyPrefix: string,
    public store: IStoreService,
    readonly multisigAddress: Address,
    readonly multisigOwners: Address[],
    readonly appsNonce?: legacy.utils.Nonce,
    readonly freeBalances?: Map<AssetType, legacy.utils.FreeBalance>,
    // FIXME: these should also be readonly
    appInstances?: Map<string, AppInstanceInfo>,
    proposedAppInstances?: Map<string, AppInstanceInfo>
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

    if (appInstances) {
      this.appInstances = appInstances;
    }
    if (proposedAppInstances) {
      this.proposedAppInstances = proposedAppInstances;
    }
  }

  async save() {
    await this.store.set(
      `${this.multisigKeyPrefix}/${this.multisigAddress}`,
      this
    );
  }

  async addProposal(appInstance: AppInstanceInfo) {
    if (!this.proposedAppInstances) {
      this.proposedAppInstances = new Map();
    }
    this.proposedAppInstances.set(appInstance.id, appInstance);
    // TODO: optimize these writes
    await this.store.set(
      `${this.multisigKeyPrefix}/${this.multisigAddress}`,
      this
    );
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
  private readonly ownersToMultisigAddress = {};

  /**
   * A convenience struct to lookup multisig address from appInstance ID.
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
    const channel: Channel = new Channel(
      this.multisigKeyPrefix,
      this.store,
      multisigAddress,
      params.owners
    );
    const ownersHash = Channels.canonicalizeAddresses(params.owners);
    this.ownersToMultisigAddress[ownersHash] = multisigAddress;
    channel.save();
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
      this.multisigKeyPrefix,
      this.store,
      channel.multisigAddress,
      channel.multisigOwners,
      channel.appsNonce,
      channel.freeBalances,
      channel.appInstances,
      channel.proposedAppInstances
    );
  }

  private async getChannelFromAppInstanceId(
    appInstanceId: string
  ): Promise<Channel> {
    const multisigAddress = this.appInstanceIdToMultisigAddress[appInstanceId];
    return await this.store.get(`${this.multisigKeyPrefix}/${multisigAddress}`);
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
    await channel.addProposal(appInstance);
    this.appInstanceIdToMultisigAddress[appInstanceId] =
      channel.multisigAddress;
    return appInstanceId;
  }

  async install(params: Node.InstallParams): Promise<AppInstanceInfo> {
    const channel = await this.getChannelFromAppInstanceId(
      params.appInstanceId
    );
    console.log("getting channel to install: ", channel);
    const appInstance: AppInstanceInfo = channel.proposedAppInstances!.get(
      params.appInstanceId
    )!;
    channel.proposedAppInstances!.delete(params.appInstanceId);
    channel.appInstances!.set(params.appInstanceId, appInstance);
    console.log("state of channel: ", channel);
    return appInstance;
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
