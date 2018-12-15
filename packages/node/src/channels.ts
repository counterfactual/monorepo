import { Address, AppInstanceInfo, Node } from "@counterfactual/common-types";
import { ethers } from "ethers";
import { v4 as generateUUID } from "uuid";

import { APP_INSTANCE_STATUS, Channel } from "./models";
import { IStoreService } from "./service-interfaces";
import { orderedAddressesHash } from "./utils";

/**
 * This class itelf does not hold any meaningful state.
 * It encapsulates the operations performed on relevant appInstances and
 * abstracts the persistence to the store service.
 */
export class Channels {
  /**
   * A convenience lookup table from a set of owners to multisig address.
   */
  private readonly ownersHashToMultisigAddress = {};

  /**
   * A convenience lookup table from appInstance UUID to multisig address.
   */
  private readonly appInstanceUUIDToMultisigAddress = {};

  /**
   * A lookup table from client-side AppInstance UUID to channel-specific
   * AppInstanceId.
   */
  private readonly appInstanceUUIDToAppInstanceId = {};

  /**
   * A lookup table from client-side AppInstance UUID to channel-specific
   * AppInstanceId.
   */
  private readonly appInstanceIdToAppInstanceUUID = {};

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
    const multisigAddress = this.generateNewMultisigAddress(params.owners);
    const channel: Channel = new Channel(multisigAddress, params.owners);
    const ownersHash = orderedAddressesHash(params.owners);
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
    const ownersHash = orderedAddressesHash(owners);
    this.ownersHashToMultisigAddress[ownersHash] = multisigAddress;
    await this.save(channel);
  }

  async getAddresses(): Promise<Address[]> {
    const channels = await this.getAllChannelsJSON();
    return Object.keys(channels);
  }

  async getAppInstanceUUIDFromAppInstanceId(appInstanceId: string) {
    return this.appInstanceIdToAppInstanceUUID[appInstanceId];
  }

  async getPeersAddressFromAppInstanceUUID(
    appInstanceUUID: string
  ): Promise<Address[]> {
    const multisigAddress = this.appInstanceUUIDToMultisigAddress[
      appInstanceUUID
    ];
    const channel: Channel = await this.getChannelJSONFromStore(
      multisigAddress
    );
    const owners = channel.multisigOwners;
    return owners.filter(owner => owner !== this.selfAddress);
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

  async getUUIDFromProposalInstall(
    params: Node.ProposeInstallParams
  ): Promise<string> {
    const uuid = generateUUID();
    const channel = await this.getChannelFromPeerAddress(params.peerAddress);

    const proposedAppInstance = { id: "", ...params };
    delete proposedAppInstance.peerAddress;

    await this.addAppInstanceProposal(channel, proposedAppInstance, uuid);
    return uuid;
  }

  async setUUIDForProposeInstall(
    params: Node.ProposeInstallParams,
    appInstanceUUID: string
  ) {
    const channel = await this.getChannelFromPeerAddress(params.peerAddress);
    const proposedAppInstance = { id: "", ...params };
    delete proposedAppInstance.peerAddress;

    await this.addAppInstanceProposal(
      channel,
      proposedAppInstance,
      appInstanceUUID
    );
    this.appInstanceUUIDToMultisigAddress[appInstanceUUID] =
      channel.multisigAddress;
  }

  async install(params: Node.InstallParams): Promise<AppInstanceInfo> {
    if (!params.appInstanceId) {
      return Promise.reject("No AppInstance ID specified to install");
    }

    const channel = await this.getChannelFromAppInstanceId(
      params.appInstanceId
    );
    // TODO: execute machine code to update channel state to include installation
    // this will obviously also correct the ID being used here
    const appInstanceId = channel.rootNonce.nonceValue.toString();

    const appInstanceUUID = params.appInstanceId;
    const appInstance: AppInstanceInfo =
      channel.proposedAppInstances[appInstanceUUID];
    appInstance.id = appInstanceId;

    await this.installAppInstance(channel, appInstanceId, appInstanceUUID);

    // modify this since we're returning it to the client
    appInstance.id = appInstanceUUID;
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
    await this.store.set([
      {
        key: `${this.multisigKeyPrefix}/${channel.multisigAddress}`,
        value: channel
      }
    ]);
  }

  /**
   * The app's installation is confirmed iff the store write operation
   * succeeds as the write operation's confirmation provides the desired
   * atomicity of moving an app instance from pending to installed.
   * @param channel
   * @param appInstance
   * @param appInstanceUUID
   */
  async installAppInstance(
    channel: Channel,
    appInstanceId: string,
    appInstanceUUID: string
  ) {
    this.appInstanceUUIDToAppInstanceId[appInstanceUUID] = appInstanceId;
    this.appInstanceIdToAppInstanceUUID[appInstanceId] = appInstanceUUID;

    const appInstance = channel.proposedAppInstances[appInstanceUUID];
    delete channel.proposedAppInstances[appInstanceUUID];

    channel.appInstances[appInstanceId] = appInstance;
    await this.store.set([
      {
        key: `${this.multisigKeyPrefix}/${channel.multisigAddress}`,
        value: channel
      }
    ]);
  }

  /**
   * Adds the given proposed appInstance to a channel's collection of proposed
   * app instances.
   * @param channel
   * @param appInstance
   * @param appInstanceUUID The UUID to refer to this AppInstance before a
   *        channel-specific ID can be created.
   */
  async addAppInstanceProposal(
    channel: Channel,
    appInstance: AppInstanceInfo,
    appInstanceUUID: string
  ) {
    this.appInstanceUUIDToMultisigAddress[appInstanceUUID] =
      channel.multisigAddress;
    channel.proposedAppInstances[appInstanceUUID] = appInstance;
    await this.store.set([
      {
        key: `${this.multisigKeyPrefix}/${
          channel.multisigAddress
        }/proposedAppInstances`,
        value: channel.proposedAppInstances
      }
    ]);
  }

  // private utility methods

  private async getChannelFromPeerAddress(
    peerAddress: Address
  ): Promise<Channel> {
    const ownersHash = orderedAddressesHash([this.selfAddress, peerAddress]);
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

  /**
   * A JSON object with keys being the app instance IDs and the values being
   * the AppInstances.
   * @param appInstances
   */
  private replaceAppInstanceIdWithUUID(appInstances: object): object {
    Object.values(appInstances).forEach(appInstance => {
      const uuid = this.appInstanceIdToAppInstanceUUID[appInstance.id];
      appInstance.id = uuid;
    });
    return appInstances;
  }

  /**
   * Gets all installed appInstances across all of the channels open on
   * this Node.
   *
   * Note that the AppInstance IDs that are returned are the AppInstanceUUIDs
   * that the clients are expecting, and not the internal AppInstance IDs.
   */
  private async getInstalledAppInstances(): Promise<AppInstanceInfo[]> {
    const apps: AppInstanceInfo[] = [];
    const channels = await this.getAllChannelsJSON();
    Object.values(channels).forEach((channel: Channel) => {
      if (channel.appInstances) {
        const modifiedAppInstances = this.replaceAppInstanceIdWithUUID(
          channel.appInstances
        );
        apps.push(...Object.values(modifiedAppInstances));
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

  private async getChannelFromAppInstanceId(
    appInstanceId: string
  ): Promise<Channel> {
    const multisigAddress = this.appInstanceUUIDToMultisigAddress[
      appInstanceId
    ];
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

  private generateNewMultisigAddress(owners: Address[]): Address {
    // TODO: implement this using CREATE2
    return ethers.Wallet.createRandom().address;
  }
}
