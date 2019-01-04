import {
  AppInstance,
  StateChannel,
  StateChannelJSON
} from "@counterfactual/machine";
import { Address, AppInstanceInfo } from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";

import {
  DB_NAMESPACE_CHANNEL,
  DB_NAMESPACE_CHANNEL_APP_INSTANCE_ID_TO_CLIENT_APP_INSTANCE_ID,
  DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_APP_INSTANCE_INFO,
  DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_CHANNEL_APP_INSTANCE_ID,
  DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS,
  DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE,
  DB_NAMESPACE_OWNERS_HASH_TO_MULTISIG_ADDRESS
} from "./db-schema";
import { IStoreService } from "./services";
import { ProposedAppInstanceInfo, ProposedAppInstanceInfoJSON } from "./types";

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
  async getAllChannelsJSON(): Promise<{
    [multisigAddress: string]: StateChannelJSON;
  }> {
    const channels = await this.storeService.get(
      `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}`
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
        `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}/${multisigAddress}`
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
      }/${DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${clientAppInstanceID}`
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
      }/${DB_NAMESPACE_CHANNEL_APP_INSTANCE_ID_TO_CLIENT_APP_INSTANCE_ID}/${channelAppInstanceID}`
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
        key: `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}/${
          stateChannel.multisigAddress
        }`,
        value: Store.sanitize(stateChannel.toJson())
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_OWNERS_HASH_TO_MULTISIG_ADDRESS}/${ownersHash}`,
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
    appInstance: AppInstance,
    stateChannel: StateChannel,
    clientAppInstanceID: string,
    appInstanceInfo: AppInstanceInfo
  ) {
    // TODO: give the right big numbers
    const updatedStateChannel = stateChannel.installApp(
      appInstance,
      bigNumberify(0),
      bigNumberify(0)
    );

    await this.storeService.set([
      {
        key: `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}/${
          stateChannel.multisigAddress
        }`,
        value: updatedStateChannel.toJson()
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_CHANNEL_APP_INSTANCE_ID}/${clientAppInstanceID}`,
        value: appInstance.id
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_CHANNEL_APP_INSTANCE_ID_TO_CLIENT_APP_INSTANCE_ID}/${
          appInstance.id
        }`,
        value: clientAppInstanceID
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${clientAppInstanceID}`,
        value: null
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_APP_INSTANCE_INFO}/${clientAppInstanceID}`,
        value: appInstanceInfo
      }
    ]);
  }

  /**
   * Adds the given proposed appInstance to a channel's collection of proposed
   * app instances.
   * @param channel
   * @param proposedAppInstance
   * @param clientAppInstanceID The ID to refer to this AppInstance before a
   *        channelAppInstanceID can be created.
   */
  async addAppInstanceProposal(
    stateChannel: StateChannel,
    proposedAppInstance: ProposedAppInstanceInfo,
    clientAppInstanceID: string
  ) {
    await this.storeService.set([
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${clientAppInstanceID}`,
        value: JSON.parse(JSON.stringify(proposedAppInstance))
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${clientAppInstanceID}`,
        value: stateChannel.multisigAddress
      }
    ]);
  }

  async getAppInstanceInfo(
    clientAppInstanceID: string
  ): Promise<AppInstanceInfo> {
    return (await this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_APP_INSTANCE_INFO}/${clientAppInstanceID}`
    )) as AppInstanceInfo;
  }

  /**
   * Returns the address of the multisig belonging to a specified set of owners
   * via the hash of the owners
   * @param ownersHash
   */
  async getMultisigAddressFromOwnersHash(ownersHash: string): Promise<string> {
    return await this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_OWNERS_HASH_TO_MULTISIG_ADDRESS}/${ownersHash}`
    );
  }

  /**
   * Returns a list of proposed AppInstances.
   */
  async getProposedAppInstances(): Promise<AppInstanceInfo[]> {
    const proposedAppInstancesJson = (await this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}`
    )) as { [clientAppInstanceID: string]: ProposedAppInstanceInfoJSON };
    return Array.from(Object.values(proposedAppInstancesJson)).map(
      proposedAppInstanceJson => {
        return ProposedAppInstanceInfo.fromJson(proposedAppInstanceJson);
      }
    );
  }

  /**
   * Returns the proposed AppInstance with the specified clientAppInstanceID.
   */
  async getProposedAppInstanceInfo(
    clientAppInstanceID: string
  ): Promise<ProposedAppInstanceInfo> {
    return ProposedAppInstanceInfo.fromJson(
      await this.storeService.get(
        `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_CLIENT_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${clientAppInstanceID}`
      )
    );
  }

  /**
   * This removes any fields whose values are `undefined`, which are invalid
   * JSON values.
   * @param json
   */
  private static sanitize(json: StateChannelJSON) {
    return {
      ...json,
      appInstances: JSON.parse(JSON.stringify(json.appInstances))
    } as StateChannelJSON;
  }
}
