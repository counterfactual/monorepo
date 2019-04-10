import {
  Address,
  AppInstanceInfo,
  SolidityABIEncoderV2Struct
} from "@counterfactual/types";
import { defaultAbiCoder, keccak256, solidityKeccak256 } from "ethers/utils";

import {
  DB_NAMESPACE_ALL_COMMITMENTS,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_INFO,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE,
  DB_NAMESPACE_CHANNEL,
  DB_NAMESPACE_OWNERS_HASH_TO_MULTISIG_ADDRESS,
  DB_NAMESPACE_WITHDRAWALS
} from "./db-schema";
import {
  AppInstance,
  StateChannel,
  StateChannelJSON,
  Transaction
} from "./machine";
import { ERRORS } from "./methods/errors";
import { ProposedAppInstanceInfo, ProposedAppInstanceInfoJSON } from "./models";
import { debugLog } from "./node";
import { IStoreService } from "./services";
import { hashOfOrderedPublicIdentifiers } from "./utils";

/**
 * A simple ORM around StateChannels and AppInstances stored using the
 * StoreService.
 */
export class Store {
  constructor(
    private readonly storeService: IStoreService,
    private readonly storeKeyPrefix: string
  ) {}

  /**
   * Returns an object with the keys being the multisig addresses and the
   * values being `StateChannel` instances.
   */
  public async getAllChannels(): Promise<{
    [multisigAddress: string]: StateChannel;
  }> {
    const channels = {};
    const channelsJSON = ((await this.storeService.get(
      `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}`
    )) || {}) as { [multisigAddress: string]: StateChannelJSON };

    const sortedChannels = Object.entries(channelsJSON).sort(
      (a, b) => b[1].createdAt || 0 - a[1].createdAt || 0
    );

    for (const [key, value] of sortedChannels) {
      channels[key] = StateChannel.fromJson(value);
    }

    return channels;
  }

  /**
   * Returns the StateChannel instance with the specified multisig address.
   * @param multisigAddress
   */
  public async getStateChannel(
    multisigAddress: Address
  ): Promise<StateChannel> {
    const stateChannelJson = await this.storeService.get(
      `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}/${multisigAddress}`
    );

    if (!stateChannelJson) {
      return Promise.reject(
        ERRORS.NO_STATE_CHANNEL_FOR_MULTISIG_ADDR(
          stateChannelJson,
          multisigAddress
        )
      );
    }

    const channel = StateChannel.fromJson(stateChannelJson);
    debugLog("Getting channel: ", channel);
    return channel;
  }

  /**
   * Returns a string identifying the multisig address the specified app instance
   * belongs to.
   * @param appInstanceId
   */
  public async getMultisigAddressFromAppInstanceID(
    appInstanceId: string
  ): Promise<Address> {
    return this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${appInstanceId}`
    );
  }

  /**
   * Returns an AppInstanceInfo from the DB based on an AppInstance object
   * @param appInstance
   */
  public async getAppInstanceInfoFromAppInstance(
    appInstance: AppInstance
  ): Promise<AppInstanceInfo> {
    return await this.getAppInstanceInfo(appInstance.identityHash);
  }

  /**
   * This persists the state of a channel.
   * @param channel
   * @param ownersHash
   */
  public async saveStateChannel(stateChannel: StateChannel) {
    const ownersHash = hashOfOrderedPublicIdentifiers(
      stateChannel.userNeuteredExtendedKeys
    );

    debugLog("Saving channel: ", stateChannel);
    await this.storeService.set([
      {
        key: `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}/${
          stateChannel.multisigAddress
        }`,
        value: stateChannel.toJson()
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
   * This persists the state of the given AppInstance.
   * @param appInstance
   */
  public async saveAppInstanceState(
    appInstanceId: string,
    newState: SolidityABIEncoderV2Struct
  ) {
    const channel = await this.getChannelFromAppInstanceID(appInstanceId);
    const updatedChannel = await channel.setState(appInstanceId, newState);
    await this.saveStateChannel(updatedChannel);
  }

  /**
   * The app's installation is confirmed iff the store write operation
   * succeeds as the write operation's confirmation provides the desired
   * atomicity of moving an app instance from being proposed to installed.
   *
   * @param appInstance
   * @param appInstanceInfo
   */
  public async saveRealizedProposedAppInstance(
    appInstanceInfo: ProposedAppInstanceInfo
  ) {
    await this.storeService.set([
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${
          appInstanceInfo.id
        }`,
        value: null
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_INFO}/${
          appInstanceInfo.id
        }`,
        value: appInstanceInfo
      }
    ]);
  }

  /**
   * Adds the given proposed appInstance to a channel's collection of proposed
   * app instances.
   * @param stateChannel
   * @param proposedAppInstance
   */
  public async addAppInstanceProposal(
    stateChannel: StateChannel,
    proposedAppInstance: ProposedAppInstanceInfo
  ) {
    await this.storeService.set([
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${
          proposedAppInstance.id
        }`,
        value: proposedAppInstance.toJson()
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${
          proposedAppInstance.id
        }`,
        value: stateChannel.multisigAddress
      }
    ]);
  }

  public async addVirtualAppInstanceProposal(
    proposedAppInstance: ProposedAppInstanceInfo
  ) {
    const sortedXpubs = [
      proposedAppInstance.proposedToIdentifier,
      proposedAppInstance.proposedByIdentifier
    ].sort();
    await this.storeService.set([
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${
          proposedAppInstance.id
        }`,
        value: proposedAppInstance.toJson()
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${
          proposedAppInstance.id
        }`,
        value: keccak256(
          defaultAbiCoder.encode(
            ["string", "string", "string"],
            [
              proposedAppInstance.intermediaries![0],
              // Ordered as [0: to, 1: by] because when executed, it is "to"
              // that becomes initiatingAddress / the idx 0 in compute-virtual-key
              sortedXpubs[0],
              sortedXpubs[1]
            ]
          )
        )
      }
    ]);
  }

  public async removeAppInstanceProposal(appInstanceId: string) {
    await this.storeService.set([
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${appInstanceId}`,
        value: null
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${appInstanceId}`,
        value: null
      }
    ]);
  }

  public async getAppInstanceInfo(
    appInstanceId: string
  ): Promise<AppInstanceInfo> {
    const appInstanceInfo = (await this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_INFO}/${appInstanceId}`
    )) as AppInstanceInfo;

    if (!appInstanceInfo) {
      return Promise.reject(
        // FIXME: Errors should be functions with parameters
        `${ERRORS.NO_APP_INSTANCE_FOR_GIVEN_ID}: ${appInstanceId}`
      );
    }

    return appInstanceInfo;
  }

  /**
   * Returns the address of the multisig belonging to a specified set of owners
   * via the hash of the owners
   * @param ownersHash
   */
  public async getMultisigAddressFromOwnersHash(
    ownersHash: string
  ): Promise<string> {
    return await this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_OWNERS_HASH_TO_MULTISIG_ADDRESS}/${ownersHash}`
    );
  }

  /**
   * Returns a list of proposed `AppInstanceInfo`s.
   */
  public async getProposedAppInstances(): Promise<AppInstanceInfo[]> {
    const proposedAppInstancesJson = (await this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}`
    )) as { [appInstanceId: string]: ProposedAppInstanceInfoJSON };
    if (!proposedAppInstancesJson) {
      return [];
    }
    return Array.from(Object.values(proposedAppInstancesJson)).map(
      proposedAppInstanceJson => {
        return ProposedAppInstanceInfo.fromJson(proposedAppInstanceJson);
      }
    );
  }

  /**
   * Returns the proposed AppInstance with the specified appInstanceId.
   */
  public async getProposedAppInstanceInfo(
    appInstanceId: string
  ): Promise<ProposedAppInstanceInfo> {
    const proposedAppInstanceInfo = await this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${appInstanceId}`
    );

    if (!proposedAppInstanceInfo) {
      return Promise.reject(
        ERRORS.NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID(appInstanceId)
      );
    }

    return ProposedAppInstanceInfo.fromJson(proposedAppInstanceInfo);
  }

  /**
   * @param appInstanceId
   */
  public async getChannelFromAppInstanceID(
    appInstanceId: string
  ): Promise<StateChannel> {
    const multisigAddress = await this.getMultisigAddressFromAppInstanceID(
      appInstanceId
    );

    if (!multisigAddress) {
      return Promise.reject(ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID);
    }

    return await this.getStateChannel(multisigAddress);
  }

  public async getWithdrawalCommitment(multisigAddress: string) {
    return this.storeService.get(
      [this.storeKeyPrefix, DB_NAMESPACE_WITHDRAWALS, multisigAddress].join("/")
    );
  }

  public async storeWithdrawalCommitment(
    multisigAddress: string,
    commitment: Transaction
  ) {
    return this.storeService.set([
      {
        key: [
          this.storeKeyPrefix,
          DB_NAMESPACE_WITHDRAWALS,
          multisigAddress
        ].join("/"),
        value: commitment
      }
    ]);
  }

  public async setCommitment(args: any[], commitment: Transaction) {
    return this.storeService.set([
      {
        key: [
          this.storeKeyPrefix,
          DB_NAMESPACE_ALL_COMMITMENTS,
          solidityKeccak256(
            ["address", "uint256", "bytes"],
            [commitment.to, commitment.value, commitment.data]
          )
        ].join("/"),
        value: args.concat([commitment])
      }
    ]);
  }

  public async getAppInstance(appInstanceId: string): Promise<AppInstance> {
    const channel = await this.getChannelFromAppInstanceID(appInstanceId);
    return channel.getAppInstance(appInstanceId);
  }
}
