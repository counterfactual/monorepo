import {
  AppInstance,
  StateChannel,
  StateChannelJSON
} from "@counterfactual/machine";
import { Address, AppInstanceInfo } from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";

import {
  DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_IDENTITY_HASH,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_INFO,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE,
  DB_NAMESPACE_APP_INSTANCE_IDENTITY_HASH_TO_APP_INSTANCE_ID,
  DB_NAMESPACE_CHANNEL,
  DB_NAMESPACE_OWNERS_HASH_TO_MULTISIG_ADDRESS
} from "./db-schema";
import { ProposedAppInstanceInfo, ProposedAppInstanceInfoJSON } from "./models";
import { IStoreService } from "./services";
import { orderedAddressesHash } from "./utils";

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
   * @param appInstanceId
   */
  async getMultisigAddressFromClientAppInstanceID(
    appInstanceId: string
  ): Promise<string> {
    return this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${appInstanceId}`
    );
  }

  /**
   * Returns a string identifying the client app instance ID that is mapped to
   * the given channel app instance ID.
   * @param appInstanceIdentityHash
   */
  async getClientAppInstanceIDFromChannelAppInstanceID(
    appInstanceIdentityHash: string
  ): Promise<string> {
    return this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_APP_INSTANCE_IDENTITY_HASH_TO_APP_INSTANCE_ID}/${appInstanceIdentityHash}`
    );
  }

  // setters

  /**
   * This persists the initial state of a channel upon channel creation.
   * @param channel
   * @param ownersHash
   */
  async saveChannel(stateChannel: StateChannel) {
    const ownersHash = orderedAddressesHash(stateChannel.multisigOwners);
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
   * @param AppInstanceIdentityHash
   * @param appInstanceId
   */
  async installAppInstance(
    appInstance: AppInstance,
    stateChannel: StateChannel,
    appInstanceId: string,
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
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_IDENTITY_HASH}/${appInstanceId}`,
        value: appInstance.identityHash
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_IDENTITY_HASH_TO_APP_INSTANCE_ID}/${
          appInstance.identityHash
        }`,
        value: appInstanceId
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${appInstanceId}`,
        value: null
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_INFO}/${appInstanceId}`,
        value: appInstanceInfo
      }
    ]);
  }

  /**
   * Adds the given proposed appInstance to a channel's collection of proposed
   * app instances.
   * @param channel
   * @param proposedAppInstance
   * @param appInstanceId The ID to refer to this AppInstance before a
   *        AppInstanceIdentityHash can be created.
   */
  async addAppInstanceProposal(
    stateChannel: StateChannel,
    proposedAppInstance: ProposedAppInstanceInfo,
    appInstanceId: string
  ) {
    await this.storeService.set([
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${appInstanceId}`,
        value: JSON.parse(JSON.stringify(proposedAppInstance))
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${appInstanceId}`,
        value: stateChannel.multisigAddress
      }
    ]);
  }

  async getAppInstanceInfo(appInstanceId: string): Promise<AppInstanceInfo> {
    return (await this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_INFO}/${appInstanceId}`
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
      }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}`
    )) as { [appInstanceId: string]: ProposedAppInstanceInfoJSON };
    return Array.from(Object.values(proposedAppInstancesJson)).map(
      proposedAppInstanceJson => {
        return ProposedAppInstanceInfo.fromJson(proposedAppInstanceJson);
      }
    );
  }

  /**
   * Returns the proposed AppInstance with the specified appInstanceId.
   */
  async getProposedAppInstanceInfo(
    appInstanceId: string
  ): Promise<ProposedAppInstanceInfo> {
    return ProposedAppInstanceInfo.fromJson(
      await this.storeService.get(
        `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${appInstanceId}`
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
