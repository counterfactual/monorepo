import { StateChannel } from "@counterfactual/machine";
import { Address, AppInstanceInfo } from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";

import {
  CHANNEL,
  CHANNEL_APP_INSTANCE_ID_TO_CLIENT_APP_INSTANCE_ID,
  CLIENT_APP_INSTANCE_ID_TO_CHANNEL_APP_INSTANCE_ID,
  CLIENT_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS,
  CLIENT_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE,
  OWNERS_HASH_TO_MULTISIG_ADDRESS
} from "./db-schema";
import { IStoreService } from "./services";

/**
 * A simple ORM around StateChannels and AppInstances stored using the
 * StoreService.
 */
export class Store {
  constructor(
    private readonly storeService: IStoreService,
    private readonly storeKeyPrefix: string
  ) {}

  // getters

  /**
   * Returns a JSON object with the keys being the multisig addresses and the
   * values being objects reflecting the StateChannel schema..
   */
  async getAllChannelsJSON(): Promise<object> {
    const channels = await this.storeService.get(
      `${this.storeKeyPrefix}/${CHANNEL}`
    );
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
  async getChannelJSONFromStore(
    multisigAddress: Address
  ): Promise<StateChannel> {
    return StateChannel.fromJson(
      await this.storeService.get(
        `${this.storeKeyPrefix}/${CHANNEL}/${multisigAddress}`
      )
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
    return this.storeService.get(
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
    return this.storeService.get(
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
  async saveChannel(stateChannel: StateChannel, ownersHash?: string) {
    await this.storeService.set([
      {
        key: `${this.storeKeyPrefix}/${CHANNEL}/${
          stateChannel.multisigAddress
        }`,
        value: stateChannel.toJson()
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${OWNERS_HASH_TO_MULTISIG_ADDRESS}/${ownersHash}`,
        value: stateChannel.multisigAddress
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
    stateChannel: StateChannel,
    channelAppInstanceID: string,
    clientAppInstanceID: string
  ) {
    const appInstance = await this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${CLIENT_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${clientAppInstanceID}`
    );

    // TODO: give the right big numbers
    stateChannel.installApp(appInstance, bigNumberify(0), bigNumberify(0));

    await this.storeService.set([
      {
        key: `${this.storeKeyPrefix}/${CHANNEL}/${
          stateChannel.multisigAddress
        }`,
        value: stateChannel
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
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${CLIENT_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${clientAppInstanceID}`,
        value: null
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
    stateChannel: StateChannel,
    appInstance: AppInstanceInfo,
    clientAppInstanceID: string
  ) {
    await this.storeService.set([
      {
        key: `${
          this.storeKeyPrefix
        }/${CLIENT_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${clientAppInstanceID}`,
        value: appInstance
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${CLIENT_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${clientAppInstanceID}`,
        value: stateChannel.multisigAddress
      }
    ]);
  }

  /**
   * Returns the address of the multisig belonging to a specified set of owners
   * via the hash of the owners
   * @param ownersHash
   */
  async getMultisigAddressFromOwnersHash(ownersHash: string): Promise<string> {
    return await this.storeService.get(
      `${this.storeKeyPrefix}/${OWNERS_HASH_TO_MULTISIG_ADDRESS}/${ownersHash}`
    );
  }

  /**
   * Returns a list of proposed AppInstances.
   */
  async getProposedAppInstances(): Promise<AppInstanceInfo[]> {
    const storeProposedAppInstances = (await this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${CLIENT_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}`
    )) as { [clientAppInstanceID: string]: AppInstanceInfo };
    return Object.values(storeProposedAppInstances);
  }

  /**
   * Returns the proposed AppInstance with the specified clientAppInstanceID.
   */
  async getProposedAppInstance(
    clientAppInstanceID: string
  ): Promise<AppInstanceInfo> {
    return await this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${CLIENT_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${clientAppInstanceID}`
    );
  }
}
