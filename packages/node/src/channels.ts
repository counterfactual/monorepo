import { Address, AppInstanceInfo, Node } from "@counterfactual/common-types";
import { Wallet } from "ethers";
import { v4 as generateUUID } from "uuid";

import { APP_INSTANCE_STATUS, Channel } from "./models";
import { IStoreService } from "./services";
import { orderedAddressesHash } from "./utils";

/**
 * Namespace under which the channels are stored.
 */
const CHANNEL = "channel";

/**
 * Namespace providing a convenience lookup table from a set of owners to multisig address.
 */
const OWNERS_HASH_TO_MULTISIG_ADDRESS = "ownersHashToMultisigAddress";

/**
 * clientAppInstanceID explanation:
 *
 * When a Node client initiates an AppInstance installation proposal, a UUID is
 * generated in the Node to identify this proposed app instance. To the Node
 * clients, this UUID becomes the ID of the AppInstance they proposed to install,
 * hence clientAppInstanceID.
 * This enables the client to immediately get a response from the Node with
 * an ID to use as a handle for the proposed AppInstance.
 *
 * When a peer Node receiving this proposal accepts it and installs it, this
 * installation generates the channelAppInstanceID for the app instance as the
 * act of installation updates the state of the channel. The two IDs,
 * clientAppInstanceID and channelAppInstanceID are then globally mapped
 * (i.e. by all participating Nodes) to each other. Any time any clients use the
 * clientAppInstanceID to refer to the AppInstance, the Node does a look up
 * for the channelAppInstanceID to get/set any state for that AppInstance inside
 * the relevant channel.
 *

/**
 * Namespace providing a convenience lookup table from clientAppInstanceID to multisig address.
 */
const CLIENT_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS =
  "clientAppInstanceIDToMultisigAddress";

/**
 * Namespace providing a lookup table from clientAppInstanceID to channelAppInstanceID.
 */
const CLIENT_APP_INSTANCE_ID_TO_CHANNEL_APP_INSTANCE_ID =
  "clientAppInstanceIDToChannelAppInstanceId";

/**
 * Namespace providing a lookup table from channelAppInstanceID to clientAppInstanceID.
 */
const CHANNEL_APP_INSTANCE_ID_TO_CLIENT_APP_INSTANCE_ID =
  "channelAppInstanceIdToClientAppInstanceID";

/**
 * This class itelf does not hold any meaningful state.
 * It encapsulates the operations performed on relevant appInstances and
 * abstracts the persistence to the store service.
 */
export class Channels {
  /**
   * @param selfAddress The address of the account being used with the Node.
   * @param store
   * @param storeKeyPrefix The prefix to add to the key being used
   *        for indexing store records (multisigs, look up tables, etc).
   */
  constructor(
    public readonly selfAddress: Address,
    private readonly store: IStoreService,
    private readonly storeKeyPrefix: string
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
    await this.saveChannel(channel, ownersHash);
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
    await this.saveChannel(channel, ownersHash);
  }

  async getAddresses(): Promise<Address[]> {
    const channels = await this.getAllChannelsJSON();
    return Object.keys(channels);
  }

  async getPeersAddressFromClientAppInstanceID(
    clientAppInstanceID: string
  ): Promise<Address[]> {
    const multisigAddress = await this.getMultisigAddressFromClientAppInstanceID(
      clientAppInstanceID
    );
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

  async proposeInstall(params: Node.ProposeInstallParams): Promise<string> {
    const uuid = generateUUID();
    const channel = await this.getChannelFromPeerAddress(params.peerAddress);

    // The ID is being set to "" because it represents the channelAppInstanceID
    const proposedAppInstance = { id: "", ...params };
    delete proposedAppInstance.peerAddress;

    await this.addAppInstanceProposal(channel, proposedAppInstance, uuid);
    return uuid;
  }

  async setClientAppInstanceIDForProposeInstall(
    params: Node.ProposeInstallParams,
    clientAppInstanceID: string
  ) {
    const channel = await this.getChannelFromPeerAddress(params.peerAddress);
    const proposedAppInstance = { id: "", ...params };
    delete proposedAppInstance.peerAddress;

    await this.addAppInstanceProposal(
      channel,
      proposedAppInstance,
      clientAppInstanceID
    );
  }

  async install(params: Node.InstallParams): Promise<AppInstanceInfo> {
    if (!params.appInstanceId) {
      return Promise.reject("No AppInstance ID specified to install");
    }

    const channel = await this.getChannelFromClientAppInstanceID(
      params.appInstanceId
    );
    // TODO: execute machine code to update channel state to include installation
    // this will obviously also correct the ID being used here
    const appInstanceId = channel.rootNonce.nonceValue.toString();

    const clientAppInstanceID = params.appInstanceId;
    const appInstance: AppInstanceInfo =
      channel.proposedAppInstances[clientAppInstanceID];
    appInstance.id = appInstanceId;

    await this.installAppInstance(channel, appInstanceId, clientAppInstanceID);

    // modify this since we're returning it to the client
    appInstance.id = clientAppInstanceID;
    return appInstance;
  }

  // Methods for interacting with the store persisting changes to a channel

  // getters

  /**
   * Returns a JSON object with the keys being the multisig addresses and the
   * values being objects reflecting the channel schema described above.
   */
  async getAllChannelsJSON(): Promise<object> {
    const channels = await this.store.get(`${this.storeKeyPrefix}/${CHANNEL}`);
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
  async getChannelJSONFromStore(multisigAddress: Address): Promise<Channel> {
    return await this.store.get(
      `${this.storeKeyPrefix}/${CHANNEL}/${multisigAddress}`
    );
  }

  /**
   * Returns a string identifying the multisig address the specified app instance
   * belongs to.
   * @param clientAppInstanceID
   */
  async getMultisigAddressFromClientAppInstanceID(
    clientAppInstanceID: string
  ): Promise<string> {
    return this.store.get(
      `${
        this.storeKeyPrefix
      }/${CLIENT_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${clientAppInstanceID}`
    );
  }

  /**
   * Returns a string identifying the client app instance ID that is mapped to
   * the given channel app instance ID.
   * @param channelAppInstanceID
   */
  async getClientAppInstanceIDFromChannelAppInstanceID(
    channelAppInstanceID: string
  ): Promise<string> {
    return this.store.get(
      `${
        this.storeKeyPrefix
      }/${CHANNEL_APP_INSTANCE_ID_TO_CLIENT_APP_INSTANCE_ID}/${channelAppInstanceID}`
    );
  }

  // setters

  /**
   * This persists the initial state of a channel upon channel creation.
   * @param channel
   * @param ownersHash
   */
  async saveChannel(channel: Channel, ownersHash: string) {
    await this.store.set([
      {
        key: `${this.storeKeyPrefix}/${CHANNEL}/${channel.multisigAddress}`,
        value: channel
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${OWNERS_HASH_TO_MULTISIG_ADDRESS}/${ownersHash}`,
        value: channel.multisigAddress
      }
    ]);
  }

  /**
   * The app's installation is confirmed iff the store write operation
   * succeeds as the write operation's confirmation provides the desired
   * atomicity of moving an app instance from pending to installed.
   * @param channel
   * @param channelAppInstanceID
   * @param clientAppInstanceID
   */
  async installAppInstance(
    channel: Channel,
    channelAppInstanceID: string,
    clientAppInstanceID: string
  ) {
    const appInstance = channel.proposedAppInstances[clientAppInstanceID];
    delete channel.proposedAppInstances[clientAppInstanceID];

    channel.appInstances[channelAppInstanceID] = appInstance;
    await this.store.set([
      {
        key: `${this.storeKeyPrefix}/${CHANNEL}/${channel.multisigAddress}`,
        value: channel
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${CLIENT_APP_INSTANCE_ID_TO_CHANNEL_APP_INSTANCE_ID}/${clientAppInstanceID}`,
        value: channelAppInstanceID
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${CHANNEL_APP_INSTANCE_ID_TO_CLIENT_APP_INSTANCE_ID}/${channelAppInstanceID}`,
        value: clientAppInstanceID
      }
    ]);
  }

  /**
   * Adds the given proposed appInstance to a channel's collection of proposed
   * app instances.
   * @param channel
   * @param appInstance
   * @param clientAppInstanceID The ID to refer to this AppInstance before a
   *        channelAppInstanceID can be created.
   */
  async addAppInstanceProposal(
    channel: Channel,
    appInstance: AppInstanceInfo,
    clientAppInstanceID: string
  ) {
    channel.proposedAppInstances[clientAppInstanceID] = appInstance;
    await this.store.set([
      {
        key: `${this.storeKeyPrefix}/${CHANNEL}/${
          channel.multisigAddress
        }/proposedAppInstances`,
        value: channel.proposedAppInstances
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${CLIENT_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${clientAppInstanceID}`,
        value: channel.multisigAddress
      }
    ]);
  }

  /**
   * Returns the address of the multisig belonging to a specified set of owners
   * via the hash of the owners
   * @param ownersHash
   */
  async getMultisigAddressFromOwnersHash(ownersHash: string): Promise<string> {
    return await this.store.get(
      `${this.storeKeyPrefix}/${OWNERS_HASH_TO_MULTISIG_ADDRESS}/${ownersHash}`
    );
  }

  // private utility methods

  private async getChannelFromPeerAddress(
    peerAddress: Address
  ): Promise<Channel> {
    const ownersHash = orderedAddressesHash([this.selfAddress, peerAddress]);
    const multisigAddress = await this.getMultisigAddressFromOwnersHash(
      ownersHash
    );
    const channel = await this.getChannelJSONFromStore(multisigAddress);
    return new Channel(
      channel.multisigAddress,
      channel.multisigOwners,
      channel.rootNonce,
      channel.freeBalances,
      channel.appInstances,
      channel.proposedAppInstances
    );
  }

  /**
   * A JSON object with keys being the app instance IDs and the values being
   * the AppInstances.
   *
   * @param appInstances
   */
  private async replaceChannelAppInstanceIDWithClientAppInstanceID(
    appInstances: object
  ): Promise<object> {
    for (const appInstance of Object.values(appInstances)) {
      const clientAppInstanceID = await this.getClientAppInstanceIDFromChannelAppInstanceID(
        appInstance.id
      );
      appInstance.id = clientAppInstanceID;
    }
    return appInstances;
  }

  /**
   * Gets all installed appInstances across all of the channels open on
   * this Node.
   *
   * Note that the AppInstance IDs that are returned are the clientAppInstanceIDs
   * that the clients are expecting, and not the channelAppInstanceIDs.
   */
  private async getInstalledAppInstances(): Promise<AppInstanceInfo[]> {
    const apps: AppInstanceInfo[] = [];
    const channels = await this.getAllChannelsJSON();
    for (const channel of Object.values(channels)) {
      if (channel.appInstances) {
        const modifiedAppInstances = await this.replaceChannelAppInstanceIDWithClientAppInstanceID(
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
    }
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

  private async getChannelFromClientAppInstanceID(
    clientAppInstanceID: string
  ): Promise<Channel> {
    const multisigAddress = await this.getMultisigAddressFromClientAppInstanceID(
      clientAppInstanceID
    );
    const channel = await this.getChannelJSONFromStore(multisigAddress);
    return new Channel(
      channel.multisigAddress,
      channel.multisigOwners,
      channel.rootNonce,
      channel.freeBalances,
      channel.appInstances,
      channel.proposedAppInstances
    );
  }

  private generateNewMultisigAddress(owners: Address[]): Address {
    // TODO: implement this using CREATE2
    return Wallet.createRandom().address;
  }
}
