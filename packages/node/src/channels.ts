import { AppInstance, StateChannel, TERMS } from "@counterfactual/machine";
import {
  Address,
  AppFunctionsSigHashes,
  AppInstanceInfo,
  AppInterface,
  AssetType,
  NetworkContext,
  Node,
  Terms
} from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import { bigNumberify, Interface } from "ethers/utils";
import { Wallet } from "ethers/wallet";
import { v4 as generateUUID } from "uuid";

import { APP_INSTANCE_STATUS } from "./db-schema";
import { ProposedAppInstanceInfo } from "./models";
import { IStoreService } from "./services";
import { Store } from "./store";
import { orderedAddressesHash } from "./utils";

/**
 * This class itself does not hold any meaningful state.
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

    stateChannel = stateChannel.setState(freeBalanceETH.identityHash, state);
    await this.store.saveChannel(stateChannel);
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

    stateChannel = stateChannel.setState(freeBalanceETH.identityHash, state);
    await this.store.saveChannel(stateChannel);
  }

  async getAllChannelAddresses(): Promise<Address[]> {
    const channels = await this.store.getAllChannels();
    return Object.keys(channels);
  }

  async getPeersAddressFromAppInstanceID(
    appInstanceId: string
  ): Promise<Address[]> {
    const multisigAddress = await this.store.getMultisigAddressFromAppInstanceID(
      appInstanceId
    );
    const stateChannel: StateChannel = await this.store.getStateChannel(
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
    const appInstanceId = generateUUID();
    const channel = await this.getChannelFromPeerAddress(params.peerAddress);

    const proposedAppInstance = new ProposedAppInstanceInfo(
      appInstanceId,
      params
    );

    await this.store.addAppInstanceProposal(
      channel,
      proposedAppInstance,
      appInstanceId
    );
    return appInstanceId;
  }

  async install(params: Node.InstallParams): Promise<AppInstanceInfo> {
    if (!params.appInstanceId) {
      return Promise.reject("No AppInstance ID specified to install");
    }

    const stateChannel = await this.store.getChannelFromAppInstanceID(
      params.appInstanceId
    );

    const appInstanceInfo = await this.store.getProposedAppInstanceInfo(
      params.appInstanceId
    );
    const appInstance: AppInstance = this.createAppInstanceFromAppInstanceInfo(
      appInstanceInfo,
      stateChannel
    );
    delete appInstanceInfo.initialState;

    const updatedStateChannel = stateChannel.installApp(
      appInstance,
      appInstanceInfo.myDeposit,
      appInstanceInfo.peerDeposit
    );

    await this.store.updateChannelWithAppInstanceInstallation(
      updatedStateChannel,
      appInstance,
      appInstanceInfo
    );

    return appInstanceInfo;
  }

  async setAppInstanceIDForProposeInstall(
    params: Node.InterNodeProposeInstallParams,
    appInstanceId: string
  ) {
    const channel = await this.getChannelFromPeerAddress(params.peerAddress);
    const proposedAppInstance = new ProposedAppInstanceInfo(
      appInstanceId,
      params
    );

    await this.store.addAppInstanceProposal(
      channel,
      proposedAppInstance,
      appInstanceId
    );
  }

  // private utility methods

  private async getChannelFromPeerAddress(
    peerAddress: Address
  ): Promise<StateChannel> {
    const ownersHash = orderedAddressesHash([this.selfAddress, peerAddress]);
    const multisigAddress = await this.store.getMultisigAddressFromOwnersHash(
      ownersHash
    );
    return await this.store.getStateChannel(multisigAddress);
  }

  /**
   * Gets all installed appInstances across all of the channels open on
   * this Node.
   */
  private async getInstalledAppInstances(): Promise<AppInstanceInfo[]> {
    const apps: AppInstanceInfo[] = [];
    const channels = await this.store.getAllChannels();
    for (const channel of Object.values(channels)) {
      if (channel.appInstances) {
        const nonFreeBalanceAppInstances = this.getNonFreeBalanceAppInstancesJSON(
          channel
        );
        const appInstanceInfos = await this.getAppInstanceInfoFromAppInstance(
          nonFreeBalanceAppInstances
        );
        apps.push(...Object.values(appInstanceInfos));
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

  private generateNewMultisigAddress(owners: Address[]): Address {
    // TODO: implement this using CREATE2
    return Wallet.createRandom().address;
  }

  /**
   * @param appInstanceInfo The AppInstanceInfo to convert
   * @param channel The channel the AppInstanceInfo belongs to
   */
  private createAppInstanceFromAppInstanceInfo(
    proposedAppInstanceInfo: ProposedAppInstanceInfo,
    channel: StateChannel
  ): AppInstance {
    const appInstanceInfo = { ...proposedAppInstanceInfo };
    const appFunctionSigHashes = this.getAppFunctionSigHashes(appInstanceInfo);

    const appInterface: AppInterface = {
      addr: appInstanceInfo.appId,
      applyAction: appFunctionSigHashes.applyAction,
      resolve: appFunctionSigHashes.resolve,
      getTurnTaker: appFunctionSigHashes.getTurnTaker,
      isStateTerminal: appFunctionSigHashes.isStateTerminal,
      stateEncoding: appInstanceInfo.abiEncodings.stateEncoding,
      actionEncoding: appInstanceInfo.abiEncodings.actionEncoding
    };

    const terms: Terms = {
      assetType: appInstanceInfo.asset.assetType,
      limit: appInstanceInfo.myDeposit.add(appInstanceInfo.peerDeposit)
    };
    if (appInstanceInfo.asset.token) {
      terms.token = appInstanceInfo.asset.token;
    } else {
      terms.token = AddressZero;
    }

    return new AppInstance(
      channel.multisigAddress,
      // TODO: generate ephemeral app-specific keys
      channel.multisigOwners,
      appInstanceInfo.timeout.toNumber(),
      appInterface,
      terms,
      // TODO: pass correct value when virtual app support gets added
      false,
      // TODO: this should be thread-safe
      channel.numInstalledApps,
      channel.rootNonceValue,
      appInstanceInfo.initialState,
      0,
      appInstanceInfo.timeout.toNumber()
    );
  }

  async getAppInstanceInfoFromAppInstance(
    appInstances: AppInstance[]
  ): Promise<AppInstanceInfo[]> {
    const appInstanceInfos: AppInstanceInfo[] = [];
    for (const appInstance of appInstances) {
      const appInstanceId = await this.store.getAppInstanceIDFromAppInstanceIdentityHash(
        appInstance.identityHash
      );
      appInstanceInfos.push(await this.store.getAppInstanceInfo(appInstanceId));
    }
    return appInstanceInfos;
  }

  getNonFreeBalanceAppInstancesJSON(stateChannel: StateChannel): AppInstance[] {
    const appInstances = stateChannel.appInstances;
    const nonFreeBalanceAppInstances: AppInstance[] = [];
    appInstances.forEach((appInstance, appInstanceIdentityHash) => {
      if (!stateChannel.appInstanceIsFreeBalance(appInstanceIdentityHash)) {
        nonFreeBalanceAppInstances.push(appInstance);
      }
    });
    return nonFreeBalanceAppInstances;
  }

  getAppFunctionSigHashes(
    appInstanceInfo: AppInstanceInfo
  ): AppFunctionsSigHashes {
    const stateEncoding = appInstanceInfo.abiEncodings.stateEncoding;

    const resolveSigHash = new Interface([
      `function resolve(${stateEncoding}, ${TERMS})`
    ]).functions.resolve.sighash;

    const getTurnTakerSigHash = new Interface([
      `function getTurnTaker(${stateEncoding})`
    ]).functions.getTurnTaker.sighash;

    const isStateTerminalSigHash = new Interface([
      `function isStateTerminal(${stateEncoding})`
    ]).functions.isStateTerminal.sighash;

    let applyActionSigHash = "0x00000000";
    if (appInstanceInfo.abiEncodings.actionEncoding !== undefined) {
      applyActionSigHash = new Interface([
        `function applyAction(${stateEncoding}, ${
          appInstanceInfo.abiEncodings.actionEncoding
        })`
      ]).functions.applyAction.sighash;
    }

    return {
      resolve: resolveSigHash,
      applyAction: applyActionSigHash,
      getTurnTaker: getTurnTakerSigHash,
      isStateTerminal: isStateTerminalSigHash
    };
  }
}
