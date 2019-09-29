import { NetworkContext, Node, SolidityValueType } from "@counterfactual/types";
import { solidityKeccak256 } from "ethers/utils";

import {
  DB_NAMESPACE_ALL_COMMITMENTS,
  DB_NAMESPACE_APP_INSTANCE_ID_TO_MULTISIG_ADDRESS,
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
  StateChannel,
  StateChannelJSON
} from "./models";
import { prettyPrintObject } from "./utils";

/**
 * A simple ORM around StateChannels and AppInstances stored using the
 * StoreService.
 */
export class Store {
  constructor(
    private readonly storeService: Node.IStoreService,
    private readonly storeKeyPrefix: string
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
    for (const sc of (await this.getStateChannelsMap()).values()) {
      if (
        sc.proposedAppInstances.has(appInstanceId) ||
        sc.appInstances.has(appInstanceId) ||
        (sc.hasFreeBalance && sc.freeBalance.identityHash === appInstanceId)
      ) {
        return sc.multisigAddress;
      }
    }

    throw new Error(NO_MULTISIG_FOR_APP_INSTANCE_ID);
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
   * Returns a list of proposed `AppInstanceProposals`s.
   */
  public async getProposedAppInstances(): Promise<AppInstanceProposal[]> {
    return [...(await this.getStateChannelsMap()).values()].reduce(
      (lst, sc) => [...lst, ...sc.proposedAppInstances.values()],
      [] as AppInstanceProposal[]
    );
  }

  /**
   * Returns the proposed AppInstance with the specified appInstanceId.
   */
  public async getAppInstanceProposal(
    appInstanceId: string
  ): Promise<AppInstanceProposal> {
    const multisigAddress = await this.getMultisigAddressFromAppInstance(
      appInstanceId
    );

    if (!multisigAddress) {
      throw new Error(
        NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID(appInstanceId)
      );
    }

    const stateChannel = await this.getStateChannel(multisigAddress);

    if (!stateChannel.proposedAppInstances.has(appInstanceId)) {
      throw new Error(
        NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID(appInstanceId)
      );
    }

    return stateChannel.proposedAppInstances.get(appInstanceId)!;
  }

  /**
   * @param appInstanceId
   */
  public async getChannelFromAppInstanceID(
    appInstanceId: string
  ): Promise<StateChannel> {
    return await this.getStateChannel(
      await this.getMultisigAddressFromAppInstance(appInstanceId)
    );
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
