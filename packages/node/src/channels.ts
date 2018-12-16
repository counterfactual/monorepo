import { legacy } from "@counterfactual/cf.js";
import {
  Address,
  AppInstanceInfo,
  AssetType,
  Node
} from "@counterfactual/common-types";
import { ethers } from "ethers";

import { IStoreService } from "./service-interfaces";
import { zeroBalance } from "./utils";

import Nonce = legacy.utils.Nonce;
import FreeBalance = legacy.utils.FreeBalance;

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
 *  rootNonce: Nonce,
 *  appInstances: Map<AppInstanceID,
 *    appInstance: {
 *      id: string,
 *      appId: Address,
 *      abiEncodings: {
 *        stateEncoding: string,
 *        actionEncoding: string
 *      },
 *      appState: any,
 *      localNonceCount: number,
 *      uninstallationNonce: {
 *        isSet: boolean,
 *        salt: string,
 *        nonceValue: number
 *      },
 *      timeout: BigNumber,
 *      asset: {
 *        assetType: AssetType,
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
 *      localNonceCount: number,
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
    readonly rootNonce: Nonce = new Nonce(true, 0, 0),
    readonly freeBalances: {
      [assetType: number]: FreeBalance;
    } = Channel.initialFreeBalances(multisigOwners, rootNonce),
    readonly appInstances: {
      [appInstanceId: string]: AppInstanceInfo;
    } = {},
    readonly proposedAppInstances: {
      [appInstanceId: string]: AppInstanceInfo;
    } = {}
  ) {}

  static initialFreeBalances(
    multisigOwners: Address[],
    initialAppsNonce: Nonce
  ): {
    [assetType: number]: FreeBalance;
  } {
    // TODO: extend to all asset types
    const ethFreeBalance = new FreeBalance(
      multisigOwners[0],
      zeroBalance,
      multisigOwners[1],
      zeroBalance,
      0,
      0,
      0,
      initialAppsNonce
    );
    return {
      [AssetType.ETH]: ethFreeBalance
    };
  }
}

/**
 * Used in standardizing how to set/get app instances within a channel according
 * to their correct status.
 */
export enum APP_INSTANCE_STATUS {
  INSTALLED = "installed",
  PROPOSED = "proposed"
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
  private readonly ownersHashToMultisigAddress = {};

  /**
   * A convenience lookup table from appInstance ID to multisig address.
   */
  private readonly appInstanceIdToMultisigAddress = {};

  /**
   * @param selfAddress The address of the account being used with the Node.
   * @param store
   * @param multisigKeyPrefix The prefix to add to the key being used
   *        for indexing multisig addresses according to the execution
   *        environment.
   */
  constructor(
    public readonly selfAddress: Address,
    private readonly store: IStoreService,
    private readonly multisigKeyPrefix: string
  ) {}

  /**
   * Called to create a new multisig for a set of owners.
   * @param multisigAddress
   * @param multisigOwners
   * @param freeBalances
   */
  async createMultisig(params: Node.CreateMultisigParams): Promise<Address> {
    const multisigAddress = Channels.generateNewMultisigAddress(params.owners);
    const channel: Channel = new Channel(multisigAddress, params.owners);
    const ownersHash = Channels.orderedAddressesHash(params.owners);
    this.ownersHashToMultisigAddress[ownersHash] = multisigAddress;
    await this.save(channel);
    return multisigAddress;
  }

  /**
   * Called when a peer creates a multisig with the account on this Node.
   * @param multisigAddress
   * @param owners
   */
  async addMultisig(multisigAddress: Address, owners: Address[]) {
    const channel = new Channel(multisigAddress, owners);
    const ownersHash = Channels.orderedAddressesHash(owners);
    this.ownersHashToMultisigAddress[ownersHash] = multisigAddress;
    await this.save(channel);
  }

  async getAddresses(): Promise<Address[]> {
    const channels = await this.getAllChannelsJSON();
    return Object.keys(channels);
  }

  private async getChannelFromPeerAddress(
    peerAddress: Address
  ): Promise<Channel> {
    const ownersHash = Channels.orderedAddressesHash([
      this.selfAddress,
      peerAddress
    ]);
    const multisigAddress = this.ownersHashToMultisigAddress[ownersHash];
    const channel = await this.getChannelJSONFromStore(multisigAddress);
    return new Channel(
      channel.multisigAddress,
      channel.multisigOwners,
      channel.appsNonce,
      channel.freeBalances,
      channel.appInstances,
      channel.proposedAppInstances
    );
  }

  public async getPeersAddressFromAppInstanceId(
    appInstanceId: string
  ): Promise<Address[]> {
    const multisigAddress = this.appInstanceIdToMultisigAddress[appInstanceId];
    const channel: Channel = await this.getChannelJSONFromStore(
      multisigAddress
    );
    const owners = channel.multisigOwners;
    return owners.filter(owner => owner !== this.selfAddress);
  }

  private async getChannelFromAppInstanceId(
    appInstanceId: string
  ): Promise<Channel> {
    const multisigAddress = this.appInstanceIdToMultisigAddress[appInstanceId];
    const channel = await this.getChannelJSONFromStore(multisigAddress);
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
   * Gets the list of app instances depending on the provided app status
   * specified.
   * @param status
   */
  async getAppInstances(
    status: APP_INSTANCE_STATUS
  ): Promise<AppInstanceInfo[]> {
    if (!Object.values(APP_INSTANCE_STATUS).includes(status)) {
      return Promise.reject(
        `The specified app status "${status}" is not a valid app instance status`
      );
    }
    if (status === APP_INSTANCE_STATUS.INSTALLED) {
      return await this.getInstalledAppInstances();
    }
    return await this.getProposedAppInstances();
  }

  /**
   * Gets all installed appInstances across all of the channels open on
   * this Node.
   */
  private async getInstalledAppInstances(): Promise<AppInstanceInfo[]> {
    const apps: AppInstanceInfo[] = [];
    const channels = await this.getAllChannelsJSON();
    Object.values(channels).forEach((channel: Channel) => {
      if (channel.appInstances) {
        apps.push(...Object.values(channel.appInstances));
      } else {
        console.log(
          `No app instances exist for channel with multisig address: ${
            channel.multisigAddress
          }`
        );
      }
    });
    return apps;
  }

  /**
   * Gets all proposed appInstances across all of the channels open on
   * this Node.
   */
  private async getProposedAppInstances(): Promise<AppInstanceInfo[]> {
    const apps: AppInstanceInfo[] = [];
    const channels = await this.getAllChannelsJSON();
    Object.values(channels).forEach((channel: Channel) => {
      if (channel.proposedAppInstances) {
        apps.push(...Object.values(channel.proposedAppInstances));
      } else {
        console.log(
          `No app instances exist for channel with multisig address: ${
            channel.multisigAddress
          }`
        );
      }
    });
    return apps;
  }

  async proposeInstall(params: Node.ProposeInstallParams): Promise<string> {
    const channel = await this.getChannelFromPeerAddress(params.peerAddress);
    // TODO: generate the id correctly
    const appInstanceId = channel.rootNonce!.nonceValue.toString();
    const appInstanceState = { ...params };
    delete appInstanceState.peerAddress;
    const appInstance: AppInstanceInfo = {
      id: appInstanceId,
      ...appInstanceState
    };
    await this.addAppInstanceProposal(channel, appInstance);
    this.appInstanceIdToMultisigAddress[appInstanceId] =
      channel.multisigAddress;
    return appInstanceId;
  }

  async install(params: Node.InstallParams): Promise<AppInstanceInfo> {
    const channel = await this.getChannelFromAppInstanceId(
      params.appInstanceId
    );
    const appInstance: AppInstanceInfo = channel.proposedAppInstances![
      params.appInstanceId
    ];
    await this.installAppInstance(channel, appInstance);
    return appInstance;
  }

  // Methods for interacting with the store persisting changes to a channel

  // getters

  /**
   * Returns a JSON object with the keys being the multisig addresses and the
   * values being objects reflecting the channel schema described above.
   */
  async getAllChannelsJSON(): Promise<object> {
    const channels = await this.store.get(this.multisigKeyPrefix);
    if (!channels) {
      console.log("No channels exist yet");
      return {};
    }
    return channels;
  }

  /**
   * Returns a JSON object matching the channel schema.
   * @param multisigAddress
   */
  async getChannelJSONFromStore(multisigAddress: Address) {
    return await this.store.get(`${this.multisigKeyPrefix}/${multisigAddress}`);
  }

  // setters

  async save(channel: Channel) {
    await this.store.set(
      `${this.multisigKeyPrefix}/${channel.multisigAddress}`,
      channel
    );
  }

  /**
   * The app's installation is confirmed iff the store write operation
   * succeeds as the write operation's confirmation provides the desired
   * atomicity of moving an app instance from pending to installed.
   * @param channel
   * @param appInstance
   */
  async installAppInstance(channel: Channel, appInstance: AppInstanceInfo) {
    delete channel.proposedAppInstances[appInstance.id];
    channel.appInstances[appInstance.id] = appInstance;
    await this.store.set(
      `${this.multisigKeyPrefix}/${channel.multisigAddress}`,
      channel
    );
  }

  /**
   * Adds the given proposed appInstance to a channel's collection of proposed
   * app instances.
   * @param channel
   * @param appInstance
   */
  async addAppInstanceProposal(channel: Channel, appInstance: AppInstanceInfo) {
    channel.proposedAppInstances[appInstance.id] = appInstance;
    await this.store.set(
      `${this.multisigKeyPrefix}/${
        channel.multisigAddress
      }/proposedAppInstances`,
      channel.proposedAppInstances
    );
  }

  // Utility methods

  static orderedAddressesHash(addresses: Address[]): string {
    addresses.sort((addrA: Address, addrB: Address) => {
      return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
    });
    return ethers.utils.hashMessage(addresses.join(""));
  }

  static generateNewMultisigAddress(owners: Address[]): Address {
    // TODO: implement this using CREATE2
    return ethers.Wallet.createRandom().address;
  }
}
