import {
  AppInstance,
  StateChannel,
  StateChannelJSON,
  types as machineTypes
} from "@counterfactual/machine";
import { Address, AppInstanceInfo } from "@counterfactual/types";

import {
  DB_NAMESPACE_APP_IDENTITY_HASH_TO_COMMITMENT,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_IDENTITY_HASH,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_INFO,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE,
  DB_NAMESPACE_APP_INSTANCE_IDENTITY_HASH_TO_APP_INSTANCE_ID,
  DB_NAMESPACE_CHANNEL,
  DB_NAMESPACE_MULTISIG_ADDRESS_TO_SETUP_COMMITMENT,
  DB_NAMESPACE_OWNERS_HASH_TO_MULTISIG_ADDRESS
} from "./db-schema";
import { ERRORS } from "./methods/errors";
import { ProposedAppInstanceInfo, ProposedAppInstanceInfoJSON } from "./models";
import { IStoreService } from "./services";
import { orderedAddressesHash } from "./utils";

const { Protocol } = machineTypes;

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
  async getAllChannels(): Promise<{
    [multisigAddress: string]: StateChannel;
  }> {
    const channels = {};
    const channelsJSON = (await this.storeService.get(
      `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}`
    )) as { [multisigAddress: string]: StateChannelJSON };

    if (!channelsJSON) {
      console.log("No channels exist yet");
    } else {
      for (const entry of Object.entries(channelsJSON)) {
        channels[entry[0]] = StateChannel.fromJson(entry[1]);
      }
    }
    return channels;
  }

  /**
   * Returns the StateChannel instance with the specified multisig address.
   * @param multisigAddress
   */
  async getStateChannel(multisigAddress: Address): Promise<StateChannel> {
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
  async getMultisigAddressFromAppInstanceID(
    appInstanceId: string
  ): Promise<Address> {
    return this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${appInstanceId}`
    );
  }

  /**
   * Returns a string identifying the `AppInstanceId` that is mapped to
   * the given `appInstanceIdentityHash`.
   * @param appInstanceIdentityHash
   */
  async getAppInstanceIDFromAppInstanceIdentityHash(
    appInstanceIdentityHash: string
  ): Promise<string> {
    return this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_APP_INSTANCE_IDENTITY_HASH_TO_APP_INSTANCE_ID}/${appInstanceIdentityHash}`
    );
  }

  /**
   * This persists the initial state of a channel upon channel creation.
   * @param channel
   * @param ownersHash
   */
  async saveStateChannel(stateChannel: StateChannel) {
    const ownersHash = orderedAddressesHash(stateChannel.multisigOwners);
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
   * The app's installation is confirmed iff the store write operation
   * succeeds as the write operation's confirmation provides the desired
   * atomicity of moving an app instance from being proposed to installed.
   * @param stateChannel
   * @param appInstance
   * @param appInstanceInfo
   */
  async updateChannelWithAppInstanceInstallation(
    stateChannel: StateChannel,
    appInstance: AppInstance,
    appInstanceInfo: AppInstanceInfo
  ) {
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
        }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_IDENTITY_HASH}/${
          appInstanceInfo.id
        }`,
        value: appInstance.identityHash
      },
      {
        key: `${
          this.storeKeyPrefix
        }/${DB_NAMESPACE_APP_INSTANCE_IDENTITY_HASH_TO_APP_INSTANCE_ID}/${
          appInstance.identityHash
        }`,
        value: appInstanceInfo.id
      },
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

  async updateChannelWithAppInstanceUpdate(stateChannel: StateChannel) {
    await this.storeService.set([
      {
        key: `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}/${
          stateChannel.multisigAddress
        }`,
        value: stateChannel.toJson()
      }
    ]);
  }

  /**
   * Adds the given proposed appInstance to a channel's collection of proposed
   * app instances.
   * @param stateChannel
   * @param proposedAppInstance
   */
  async addAppInstanceProposal(
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
   * Returns a list of proposed `AppInstanceInfo`s.
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
    const proposedAppInstance = await this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${appInstanceId}`
    );
    if (!proposedAppInstance) {
      return Promise.reject(
        ERRORS.NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID
      );
    }
    return ProposedAppInstanceInfo.fromJson(proposedAppInstance);
  }

  /**
   * @param appInstanceId
   */
  async getChannelFromAppInstanceID(
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

  async setCommitmentForAppIdentityHash(
    appIdentityHash: string,
    protocol: string,
    commitment: machineTypes.Transaction
  ) {
    if (!(protocol in Protocol)) {
      throw new Error(`No such protocol: ${protocol}`);
    }
    return this.storeService.set([
      {
        key: this.computeAppInstanceCommitmentKey(appIdentityHash, protocol),
        value: commitment
      }
    ]);
  }

  async setSetupCommitmentForMultisig(
    multisigAddress: string,
    commitment: machineTypes.Transaction
  ) {
    return this.storeService.set([
      {
        key: this.computeMultisigSetupCommitmentKey(multisigAddress),
        value: commitment
      }
    ]);
  }

  private async loadCommitment(key: string): Promise<machineTypes.Transaction> {
    const { to, value, data } = await this.storeService.get(key);
    return {
      to,
      data,
      value: parseInt(value, 10)
    };
  }

  async getCommitmentForAppIdentityHash(
    appIdentityHash: string,
    protocol: string
  ): Promise<machineTypes.Transaction> {
    const key = this.computeAppInstanceCommitmentKey(appIdentityHash, protocol);
    return this.loadCommitment(key);
  }

  async getSetupCommitmentForMultisig(
    multisigAddress: string
  ): Promise<machineTypes.Transaction> {
    const key = this.computeMultisigSetupCommitmentKey(multisigAddress);
    return this.loadCommitment(key);
  }

  private computeAppInstanceCommitmentKey(
    protocol: string,
    appIdentityHash: string
  ): string {
    return [
      this.storeKeyPrefix,
      DB_NAMESPACE_APP_IDENTITY_HASH_TO_COMMITMENT,
      appIdentityHash,
      protocol
    ].join("/");
  }

  private computeMultisigSetupCommitmentKey(multisigAddress: string): string {
    return [
      this.storeKeyPrefix,
      DB_NAMESPACE_MULTISIG_ADDRESS_TO_SETUP_COMMITMENT,
      multisigAddress
    ].join("/");
  }

  /**
   * Returns a string identifying the `AppInstanceIdentityHash` that is mapped to
   * the given `appInstanceId`.
   * @param appInstanceId
   */
  async getAppInstanceIdentityHashFromAppInstanceId(
    appInstanceId: string
  ): Promise<string> {
    return this.storeService.get(
      `${
        this.storeKeyPrefix
      }/${DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE_IDENTITY_HASH}/${appInstanceId}`
    );
  }
}
