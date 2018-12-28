import { StateChannel } from "@counterfactual/machine";
import {
  Address,
  AppInstanceInfo,
  AssetType,
  NetworkContext,
  Node
} from "@counterfactual/types";
import { Wallet } from "ethers";
import { bigNumberify } from "ethers/utils";
import { v4 as generateUUID } from "uuid";

import { APP_INSTANCE_STATUS } from "./db-schema";
import { IStoreService } from "./services";
import { Store } from "./store";
import { orderedAddressesHash } from "./utils";

/**
 * This class itelf does not hold any meaningful state.
 * It encapsulates the operations performed on relevant appInstances and
 * abstracts the persistence to the store service.
 */
export class Channels {
  private readonly store: Store;
  /**
   * @param selfAddress The address of the account being used with the Node.
   * @param store
   * @param storeKeyPrefix The prefix to add to the key being used
   *        for indexing store records (multisigs, look up tables, etc).
   */
  constructor(
    readonly selfAddress: Address,
    readonly networkContext: NetworkContext,
    storeService: IStoreService,
    storeKeyPrefix: string
  ) {
    this.store = new Store(storeService, storeKeyPrefix);
  }

  /**
   * Called to create a new multisig for a set of owners.
   * @param multisigAddress
   * @param multisigOwners
   * @param freeBalances
   */
  async createMultisig(params: Node.CreateMultisigParams): Promise<Address> {
    const multisigAddress = this.generateNewMultisigAddress(params.owners);
    let stateChannel: StateChannel = new StateChannel(
      multisigAddress,
      params.owners
    ).setupChannel(this.networkContext);
    const freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

    const state = {
      alice: stateChannel.multisigOwners[0],
      bob: stateChannel.multisigOwners[1],
      aliceBalance: bigNumberify(0),
      bobBalance: bigNumberify(0)
    };

    stateChannel = stateChannel.setState(freeBalanceETH.id, state);
    const ownersHash = orderedAddressesHash(params.owners);
    await this.store.saveChannel(stateChannel, ownersHash);
    return multisigAddress;
  }

  /**
   * Called when a peer creates a multisig with the account on this Node.
   * @param multisigAddress
   * @param owners
   */
  async addMultisig(multisigAddress: Address, owners: Address[]) {
    let stateChannel = new StateChannel(multisigAddress, owners).setupChannel(
      this.networkContext
    );
    const freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

    const state = {
      alice: stateChannel.multisigOwners[0],
      bob: stateChannel.multisigOwners[1],
      aliceBalance: bigNumberify(0),
      bobBalance: bigNumberify(0)
    };

    stateChannel = stateChannel.setState(freeBalanceETH.id, state);
    const ownersHash = orderedAddressesHash(owners);
    await this.store.saveChannel(stateChannel, ownersHash);
  }

  async getAddresses(): Promise<Address[]> {
    const channels = await this.store.getAllChannelsJSON();
    return Object.keys(channels);
  }

  async getPeersAddressFromClientAppInstanceID(
    clientAppInstanceID: string
  ): Promise<Address[]> {
    const multisigAddress = await this.store.getMultisigAddressFromClientAppInstanceID(
      clientAppInstanceID
    );
    const stateChannel: StateChannel = await this.store.getChannelJSONFromStore(
      multisigAddress
    );
    const owners = stateChannel.multisigOwners;
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
    return await this.store.getProposedAppInstances();
  }

  async proposeInstall(params: Node.ProposeInstallParams): Promise<string> {
    const uuid = generateUUID();
    const channel = await this.getChannelFromPeerAddress(params.peerAddress);

    // The ID is being set to "" because it represents the channelAppInstanceID
    const proposedAppInstance = { id: "", ...params };
    delete proposedAppInstance.peerAddress;

    await this.store.addAppInstanceProposal(channel, proposedAppInstance, uuid);
    return uuid;
  }

  async setClientAppInstanceIDForProposeInstall(
    params: Node.ProposeInstallParams,
    clientAppInstanceID: string
  ) {
    const channel = await this.getChannelFromPeerAddress(params.peerAddress);
    const proposedAppInstance = { id: "", ...params };
    delete proposedAppInstance.peerAddress;

    await this.store.addAppInstanceProposal(
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
    // const appInstanceId = channel.rootNonce.nonceValue.toString();
    const appInstanceId = "0";

    const clientAppInstanceID = params.appInstanceId;
    const appInstance: AppInstanceInfo = await this.store.getProposedAppInstance(
      clientAppInstanceID
    );
    appInstance.id = appInstanceId;

    await this.store.installAppInstance(
      channel,
      appInstanceId,
      clientAppInstanceID
    );

    // modify this since we're returning it to the client
    appInstance.id = clientAppInstanceID;
    return appInstance;
  }

  // private utility methods

  private async getChannelFromPeerAddress(
    peerAddress: Address
  ): Promise<StateChannel> {
    const ownersHash = orderedAddressesHash([this.selfAddress, peerAddress]);
    const multisigAddress = await this.store.getMultisigAddressFromOwnersHash(
      ownersHash
    );
    return await this.store.getChannelJSONFromStore(multisigAddress);
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
      const clientAppInstanceID = await this.store.getClientAppInstanceIDFromChannelAppInstanceID(
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
    const channels = await this.store.getAllChannelsJSON();
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

  private async getChannelFromClientAppInstanceID(
    clientAppInstanceID: string
  ): Promise<StateChannel> {
    const multisigAddress = await this.store.getMultisigAddressFromClientAppInstanceID(
      clientAppInstanceID
    );
    return await this.store.getChannelJSONFromStore(multisigAddress);
  }

  private generateNewMultisigAddress(owners: Address[]): Address {
    // TODO: implement this using CREATE2
    return Wallet.createRandom().address;
  }
}
