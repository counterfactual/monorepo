import { NetworkContext, Node, SolidityValueType } from "@counterfactual/types";
import { solidityKeccak256 } from "ethers/utils";

import {
  DB_NAMESPACE_ALL_COMMITMENTS,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE,
  DB_NAMESPACE_CHANNEL,
  DB_NAMESPACE_WITHDRAWALS
} from "./db-schema";
import {
  NO_MULTISIG_FOR_APP_INSTANCE_ID,
  NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID,
  NO_STATE_CHANNEL_FOR_MULTISIG_ADDR
} from "./methods/errors";
import {
  AppInstance,
  AppInstanceProposal,
  AppInstanceProposalJSON,
  StateChannel,
  StateChannelJSON
} from "./models";
import { getCreate2MultisigAddress, prettyPrintObject } from "./utils";

/**
 * A simple ORM around StateChannels and AppInstances stored using the
 * StoreService.
 */
export class Store {
  constructor(
    private readonly storeService: Node.IStoreService,
    private readonly storeKeyPrefix: string,
    private readonly networkContext: NetworkContext
  ) {}

  /**
   * Returns an object with the keys being the multisig addresses and the
   * values being `StateChannel` instances.
   */
  public async getStateChannelsMap(): Promise<Map<string, StateChannel>> {
    const channelsJSON = ((await this.storeService.get(
      `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}`
    )) || {}) as { [multisigAddress: string]: StateChannelJSON };

    return new Map(
      Object.values(channelsJSON)
        .map(StateChannel.fromJson)
        .sort((a, b) => b.createdAt || 0 - a.createdAt || 0)
        .map(sc => [sc.multisigAddress, sc])
    );
  }

  /**
   * Returns the StateChannel instance with the specified multisig address.
   * @param multisigAddress
   */
  public async getStateChannel(multisigAddress: string): Promise<StateChannel> {
    const stateChannelJson = await this.storeService.get(
      `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}/${multisigAddress}`
    );

    if (!stateChannelJson) {
      throw Error(NO_STATE_CHANNEL_FOR_MULTISIG_ADDR(multisigAddress));
    }

    const channel = StateChannel.fromJson(stateChannelJson);
    return channel;
  }

  /**
   * Checks if a StateChannel is in the store
   */
  public async hasStateChannel(multisigAddress: string): Promise<boolean> {
    return !!(await this.storeService.get(
      `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}/${multisigAddress}`
    ));
  }

  /**
   * Returns a string identifying the multisig address the specified app instance
   * belongs to.
   * @param appInstanceId
   */
  public async getMultisigAddressFromAppInstance(
    appInstanceId: string
  ): Promise<string> {
    return this.storeService.get(
      `${this.storeKeyPrefix}/${DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${appInstanceId}`
    );
  }

  /**
   * This persists the state of a channel.
   * @param stateChannel
   */
  public async saveStateChannel(stateChannel: StateChannel) {
    await this.storeService.set([
      {
        path: `${this.storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}/${stateChannel.multisigAddress}`,
        value: stateChannel.toJson()
      }
    ]);
  }

  public async saveFreeBalance(channel: StateChannel) {
    const freeBalance = channel.freeBalance;
    await this.storeService.set([
      {
        path: `${this.storeKeyPrefix}/${DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${freeBalance.identityHash}`,
        value: channel.multisigAddress
      }
    ]);
  }

  /**
   * This persists the state of the given AppInstance.
   * @param appInstance
   */
  public async saveAppInstanceState(
    appInstanceId: string,
    newState: SolidityValueType
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
   * @param proposedAppInstance
   */
  public async saveRealizedProposedAppInstance(
    proposedAppInstance: AppInstanceProposal
  ) {
    await this.storeService.set(
      [
        {
          path: `${this.storeKeyPrefix}/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${proposedAppInstance.identityHash}`,
          value: null
        },
        {
          path: `${this.storeKeyPrefix}/${DB_NAMESPACE_APP_INSTANCE_ID_TO_APP_INSTANCE}/${proposedAppInstance.identityHash}`,
          value: proposedAppInstance
        }
      ],
      true
    );
  }

  /**
   * Adds the given proposed appInstance to a channel's collection of proposed
   * app instances.
   * @param stateChannel
   * @param proposedAppInstance
   */
  public async addAppInstanceProposal(
    stateChannel: StateChannel,
    proposedAppInstance: AppInstanceProposal
  ) {
    await this.storeService.set([
      {
        path: `${this.storeKeyPrefix}/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${proposedAppInstance.identityHash}`,
        value: proposedAppInstance.toJson()
      },
      {
        path: `${this.storeKeyPrefix}/${DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${proposedAppInstance.identityHash}`,
        value: stateChannel.multisigAddress
      }
    ]);
  }

  public async removeAppInstanceProposal(appInstanceId: string) {
    await this.storeService.set(
      [
        {
          path: `${this.storeKeyPrefix}/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${appInstanceId}`,
          value: null
        },
        {
          path: `${this.storeKeyPrefix}/${DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS}/${appInstanceId}`,
          value: null
        }
      ],
      true
    );
  }

  /**
   * Returns a list of proposed `AppInstanceProposals`s.
   */
  public async getProposedAppInstances(): Promise<AppInstanceProposal[]> {
    const proposedAppInstancesJson = (await this.storeService.get(
      [
        this.storeKeyPrefix,
        DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE
      ].join("/")
    )) as { [appInstanceId: string]: AppInstanceProposalJSON };

    if (!proposedAppInstancesJson) {
      return [];
    }

    return Array.from(Object.values(proposedAppInstancesJson)).map(
      proposedAppInstanceJson => {
        return AppInstanceProposal.fromJson(proposedAppInstanceJson);
      }
    );
  }

  /**
   * Returns the proposed AppInstance with the specified appInstanceId.
   */
  public async getAppInstanceProposal(
    appInstanceId: string
  ): Promise<AppInstanceProposal> {
    const appInstanceProposal = await this.storeService.get(
      `${this.storeKeyPrefix}/${DB_NAMESPACE_APP_INSTANCE_ID_TO_PROPOSED_APP_INSTANCE}/${appInstanceId}`
    );

    if (!appInstanceProposal) {
      throw new Error(
        NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID(appInstanceId)
      );
    }

    return AppInstanceProposal.fromJson(appInstanceProposal);
  }

  /**
   * @param appInstanceId
   */
  public async getChannelFromAppInstanceID(
    appInstanceId: string
  ): Promise<StateChannel> {
    const multisigAddress = await this.getMultisigAddressFromAppInstance(
      appInstanceId
    );

    if (!multisigAddress) {
      throw new Error(NO_MULTISIG_FOR_APP_INSTANCE_ID);
    }

    return await this.getStateChannel(multisigAddress);
  }

  public async getWithdrawalCommitment(
    multisigAddress: string
  ): Promise<Node.MinimalTransaction> {
    return this.storeService.get(
      [this.storeKeyPrefix, DB_NAMESPACE_WITHDRAWALS, multisigAddress].join("/")
    );
  }

  public async storeWithdrawalCommitment(
    multisigAddress: string,
    commitment: Node.MinimalTransaction
  ) {
    return this.storeService.set([
      {
        path: [
          this.storeKeyPrefix,
          DB_NAMESPACE_WITHDRAWALS,
          multisigAddress
        ].join("/"),
        value: commitment
      }
    ]);
  }

  public async setCommitment(args: any[], commitment: Node.MinimalTransaction) {
    return this.storeService.set([
      {
        path: [
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

  public async getOrCreateStateChannelBetweenVirtualAppParticipants(
    multisigAddress: string,
    initiatorXpub: string,
    responderXpub: string
  ): Promise<StateChannel> {
    try {
      return await this.getStateChannel(multisigAddress);
    } catch (e) {
      if (
        e
          .toString()
          .includes(NO_STATE_CHANNEL_FOR_MULTISIG_ADDR(multisigAddress))
      ) {
        const stateChannel = StateChannel.createEmptyChannel(multisigAddress, [
          initiatorXpub,
          responderXpub
        ]);

        await this.saveStateChannel(stateChannel);

        return stateChannel;
      }

      throw Error(prettyPrintObject(e));
    }
  }
}
