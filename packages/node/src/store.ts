import { Node, SolidityValueType } from "@counterfactual/types";
import { solidityKeccak256 } from "ethers/utils";

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
import { getCreate2MultisigAddress, prettyPrintObject } from "./utils";

interface SharedData {
  version: 1; // TODO: Add better versioning & migrations tooling
  stateChannelsMap: { [multisigAddress: string]: StateChannelJSON };
  commitments: { [specialHash: string]: any[] };
  withdrawals: { [multisigAddress: string]: Node.MinimalTransaction };
}

/**
 * A simple ORM around StateChannels and AppInstances stored using the
 * StoreService.
 */
export class Store {
  public sharedData: SharedData = {
    version: 1,
    stateChannelsMap: {},
    commitments: {},
    withdrawals: {}
  };

  constructor(
    private readonly storeService: Node.IStoreService,
    private readonly storeKeyPrefix: string
  ) {}

  public async connectDB() {
    this.sharedData = Object.assign(
      {},
      await this.storeService.get(this.storeKeyPrefix),
      {
        version: 1,
        stateChannelsMap: {},
        commitments: {},
        withdrawals: {}
      }
    );
  }

  public async persistDB() {
    await this.storeService.set([
      { path: this.storeKeyPrefix, value: this.sharedData }
    ]);
  }

  /**
   * Returns an object with the keys being the multisig addresses and the
   * values being `StateChannel` instances.
   */
  public async getStateChannelsMap(): Promise<Map<string, StateChannel>> {
    return new Map(
      Object.values(this.sharedData.stateChannelsMap)
        .map(StateChannel.fromJson)
        .map(sc => [sc.multisigAddress, sc])
    );
  }

  /**
   * Returns the StateChannel instance with the specified multisig address.
   * @param multisigAddress
   */
  public async getStateChannel(multisigAddress: string): Promise<StateChannel> {
    const stateChannelJson = this.sharedData.stateChannelsMap[multisigAddress];

    if (!stateChannelJson) {
      throw Error(NO_STATE_CHANNEL_FOR_MULTISIG_ADDR(multisigAddress));
    }

    return StateChannel.fromJson(stateChannelJson);
  }

  /**
   * Checks if a StateChannel is in the store
   */
  public async hasStateChannel(multisigAddress: string): Promise<boolean> {
    return !!this.sharedData.stateChannelsMap[multisigAddress];
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
    this.sharedData.stateChannelsMap[
      stateChannel.multisigAddress
    ] = stateChannel.toJson();
    await this.persistDB();
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
    return this.sharedData.withdrawals[multisigAddress];
  }

  public async storeWithdrawalCommitment(
    multisigAddress: string,
    commitment: Node.MinimalTransaction
  ) {
    this.sharedData.withdrawals[multisigAddress] = commitment;
    await this.persistDB();
  }

  public async setCommitment(args: any[], commitment: Node.MinimalTransaction) {
    this.sharedData.commitments[
      solidityKeccak256(
        ["address", "uint256", "bytes"],
        [commitment.to, commitment.value, commitment.data]
      )
    ] = args.concat([commitment]);
    await this.persistDB();
  }

  public async getAppInstance(appInstanceId: string): Promise<AppInstance> {
    const channel = await this.getChannelFromAppInstanceID(appInstanceId);
    return channel.getAppInstance(appInstanceId);
  }

  public async getMultisigAddressWithCounterparty(
    myIdentifier: string,
    theirIdentifier: string,
    proxyFactoryAddress: string,
    minimumViableMultisigAddress: string
  ) {
    const stateChannelsMap = await this.getStateChannelsMap();
    for (const stateChannel of stateChannelsMap.values()) {
      if (
        stateChannel.userNeuteredExtendedKeys.sort() ===
        [myIdentifier, theirIdentifier].sort()
      ) {
        return stateChannel.multisigAddress;
      }
    }

    return getCreate2MultisigAddress(
      [myIdentifier, theirIdentifier],
      proxyFactoryAddress,
      minimumViableMultisigAddress
    );
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
