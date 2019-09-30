import { AppInstanceJson, SolidityValueType } from "@counterfactual/types";
import { BigNumber, bigNumberify } from "ethers/utils";

import {
  flip,
  flipTokenIndexedBalances
} from "../ethereum/utils/free-balance-app";
import { xkeyKthAddress } from "../machine/xkeys";
import { Store } from "../store";
import { prettyPrintObject } from "../utils";

import { AppInstanceProposal, AppInstanceProposalJSON } from ".";
import { AppInstance } from "./app-instance";
import {
  CoinTransferMap,
  createFreeBalance,
  FreeBalanceClass,
  TokenIndexedCoinTransferMap
} from "./free-balance";

// TODO: Hmmm this code should probably be somewhere else?
export const HARD_CODED_ASSUMPTIONS = {
  freeBalanceDefaultTimeout: 172800
};

const ERRORS = {
  APPS_NOT_EMPTY: (size: number) =>
    `Expected the appInstances list to be empty but size ${size}`,
  APP_DOES_NOT_EXIST: (identityHash: string) =>
    `Attempted to edit an appInstance that does not exist: identity hash = ${identityHash}`,
  FREE_BALANCE_MISSING: "Cannot find ETH Free Balance App in StateChannel",
  FREE_BALANCE_IDX_CORRUPT: (idx: string) =>
    `Index ${idx} used to find ETH Free Balance is broken`,
  INSUFFICIENT_FUNDS:
    "Attempted to install an appInstance without sufficient funds",
  MULTISIG_OWNERS_NOT_SORTED:
    "multisigOwners parameter of StateChannel must be sorted"
};

function sortAddresses(addrs: string[]) {
  return addrs.sort((a, b) => (parseInt(a, 16) < parseInt(b, 16) ? -1 : 1));
}

export type SingleAssetTwoPartyIntermediaryAgreement = {
  timeLockedPassThroughIdentityHash: string;
  capitalProvided: BigNumber;
  capitalProvider: string;
  virtualAppUser: string;
  tokenAddress: string;
};

type SingleAssetTwoPartyIntermediaryAgreementJSON = {
  timeLockedPassThroughIdentityHash: string;
  capitalProvided: { _hex: string };
  capitalProvider: string;
  virtualAppUser: string;
  tokenAddress: string;
};

export type StateChannelJSON = {
  readonly multisigAddress: string;
  readonly userNeuteredExtendedKeys: string[];
  readonly proposedAppInstances: [string, AppInstanceProposalJSON][];
  readonly appInstances: [string, AppInstanceJson][];
  readonly singleAssetTwoPartyIntermediaryAgreements: [
    string,
    SingleAssetTwoPartyIntermediaryAgreementJSON
  ][];
  readonly freeBalanceAppInstance: AppInstanceJson | undefined;
  readonly monotonicNumProposedApps: number;
  readonly createdAt: number;
};

export class StateChannel {
  constructor(
    public readonly multisigAddress: string,
    public readonly userNeuteredExtendedKeys: string[],
    readonly proposedAppInstances: ReadonlyMap<
      string,
      AppInstanceProposal
    > = new Map<string, AppInstanceProposal>([]),
    readonly appInstances: ReadonlyMap<string, AppInstance> = new Map<
      string,
      AppInstance
    >([]),
    readonly singleAssetTwoPartyIntermediaryAgreements: ReadonlyMap<
      string,
      SingleAssetTwoPartyIntermediaryAgreement
    > = new Map<string, SingleAssetTwoPartyIntermediaryAgreement>([]),
    private readonly freeBalanceAppInstance?: AppInstance,
    private readonly monotonicNumProposedApps: number = 0,
    public readonly createdAt: number = Date.now()
  ) {
    userNeuteredExtendedKeys.forEach(xpub => {
      if (!xpub.startsWith("xpub")) {
        throw Error(
          `StateChannel constructor given invalid extended keys: ${prettyPrintObject(
            userNeuteredExtendedKeys
          )}`
        );
      }
    });
  }

  public get multisigOwners() {
    return this.getSigningKeysFor(0);
  }

  public get numProposedApps() {
    return this.monotonicNumProposedApps;
  }

  public get numActiveApps() {
    return this.appInstances.size;
  }

  public getAppInstance(appInstanceIdentityHash: string): AppInstance {
    if (!this.appInstances.has(appInstanceIdentityHash)) {
      throw Error(ERRORS.APP_DOES_NOT_EXIST(appInstanceIdentityHash));
    }
    return this.appInstances.get(appInstanceIdentityHash)!;
  }

  public hasAppInstance(appInstanceId: string): boolean {
    return this.appInstances.has(appInstanceId);
  }

  public hasAppInstanceOfKind(address: string): boolean {
    return (
      Array.from(this.appInstances.values()).filter(
        (appInstance: AppInstance) => {
          return appInstance.appInterface.addr === address;
        }
      ).length > 0
    );
  }

  public mostRecentlyInstalledAppInstance(): AppInstance {
    if (this.appInstances.size === 0) {
      throw Error("There are no installed AppInstances in this StateChannel");
    }
    return [...this.appInstances.values()].reduce((prev, current) =>
      current.appSeqNo > prev.appSeqNo ? current : prev
    );
  }

  public mostRecentlyProposedAppInstance(): AppInstanceProposal {
    if (this.proposedAppInstances.size === 0) {
      throw Error("There are no proposed AppInstances in this StateChannel");
    }
    return [...this.proposedAppInstances.values()].reduce((prev, current) =>
      current.appSeqNo > prev.appSeqNo ? current : prev
    );
  }

  public getAppInstanceOfKind(address: string) {
    const appInstances = Array.from(this.appInstances.values()).filter(
      (appInstance: AppInstance) => {
        return appInstance.appInterface.addr === address;
      }
    );
    if (appInstances.length !== 1) {
      throw Error(
        `No AppInstance of addr ${address} exists on channel: ${this.multisigAddress}`
      );
    }
    return appInstances[0];
  }

  public isAppInstanceInstalled(appInstanceIdentityHash: string) {
    return this.appInstances.has(appInstanceIdentityHash);
  }

  public getSigningKeysFor(addressIndex: number): string[] {
    return sortAddresses(
      this.userNeuteredExtendedKeys.map(xpub =>
        xkeyKthAddress(xpub, addressIndex)
      )
    );
  }

  public getNextSigningKeys(): string[] {
    return this.getSigningKeysFor(this.monotonicNumProposedApps);
  }

  public get hasFreeBalance(): boolean {
    return !!this.freeBalanceAppInstance;
  }

  public get freeBalance(): AppInstance {
    if (this.freeBalanceAppInstance) {
      return this.freeBalanceAppInstance;
    }

    throw Error(
      "There is no free balance app instance installed in this state channel"
    );
  }

  public getMultisigOwnerAddrOf(xpub: string): string {
    const [alice, bob] = this.multisigOwners;

    const topLevelKey = xkeyKthAddress(xpub, 0);

    if (topLevelKey !== alice && topLevelKey !== bob) {
      throw Error(
        `getMultisigOwnerAddrOf received invalid xpub not in multisigOwners: ${xpub}`
      );
    }

    return topLevelKey;
  }

  public getFreeBalanceAddrOf(xpub: string): string {
    const [alice, bob] = this.freeBalanceAppInstance!.participants;

    const topLevelKey = xkeyKthAddress(xpub, 0);

    if (topLevelKey !== alice && topLevelKey !== bob) {
      throw Error(
        `getFreeBalanceAddrOf received invalid xpub without free balance account: ${xpub}`
      );
    }

    return topLevelKey;
  }

  public getFreeBalanceClass() {
    return FreeBalanceClass.fromAppInstance(this.freeBalance);
  }

  private build(args: {
    multisigAddress?: string;
    userNeuteredExtendedKeys?: string[];
    appInstances?: ReadonlyMap<string, AppInstance>;
    proposedAppInstances?: ReadonlyMap<string, AppInstanceProposal>;
    singleAssetTwoPartyIntermediaryAgreements?: ReadonlyMap<
      string,
      SingleAssetTwoPartyIntermediaryAgreement
    >;
    freeBalanceAppInstance?: AppInstance;
    monotonicNumProposedApps?: number;
    createdAt?: number;
  }) {
    return new StateChannel(
      args.multisigAddress || this.multisigAddress,
      args.userNeuteredExtendedKeys || this.userNeuteredExtendedKeys,
      args.proposedAppInstances || this.proposedAppInstances,
      args.appInstances || this.appInstances,
      args.singleAssetTwoPartyIntermediaryAgreements ||
        this.singleAssetTwoPartyIntermediaryAgreements,
      args.freeBalanceAppInstance || this.freeBalanceAppInstance,
      args.monotonicNumProposedApps || this.monotonicNumProposedApps,
      args.createdAt || this.createdAt
    );
  }

  public incrementFreeBalance(increments: TokenIndexedCoinTransferMap) {
    return this.build({
      freeBalanceAppInstance: this.getFreeBalanceClass()
        .increment(increments)
        .toAppInstance(this.freeBalance)
    });
  }

  public addActiveApp(activeApp: string) {
    return this.build({
      freeBalanceAppInstance: this.getFreeBalanceClass()
        .addActiveApp(activeApp)
        .toAppInstance(this.freeBalance)
    });
  }

  public removeActiveApp(activeApp: string) {
    return this.build({
      freeBalanceAppInstance: this.getFreeBalanceClass()
        .removeActiveApp(activeApp)
        .toAppInstance(this.freeBalance)
    });
  }

  public addActiveAppAndIncrementFreeBalance(
    activeApp: string,
    tokenIndexedIncrements: TokenIndexedCoinTransferMap
  ) {
    return this.incrementFreeBalance(tokenIndexedIncrements).addActiveApp(
      activeApp
    );
  }

  public removeActiveAppAndIncrementFreeBalance(
    activeApp: string,
    tokenIndexedIncrements: TokenIndexedCoinTransferMap
  ) {
    return this.removeActiveApp(activeApp).incrementFreeBalance(
      tokenIndexedIncrements
    );
  }

  public setFreeBalance(newFreeBalanceClass: FreeBalanceClass) {
    return this.build({
      freeBalanceAppInstance: newFreeBalanceClass.toAppInstance(
        this.freeBalance
      )
    });
  }

  public static setupChannel(
    freeBalanceAppAddress: string,
    multisigAddress: string,
    userNeuteredExtendedKeys: string[],
    freeBalanceTimeout?: number
  ) {
    return new StateChannel(
      multisigAddress,
      userNeuteredExtendedKeys,
      new Map<string, AppInstanceProposal>([]),
      new Map<string, AppInstance>([]),
      new Map<string, SingleAssetTwoPartyIntermediaryAgreement>(),
      createFreeBalance(
        userNeuteredExtendedKeys,
        freeBalanceAppAddress,
        freeBalanceTimeout || HARD_CODED_ASSUMPTIONS.freeBalanceDefaultTimeout
      ),
      1
    );
  }

  public static createEmptyChannel(
    multisigAddress: string,
    userNeuteredExtendedKeys: string[]
  ) {
    return new StateChannel(
      multisigAddress,
      userNeuteredExtendedKeys,
      new Map<string, AppInstanceProposal>([]),
      new Map<string, AppInstance>(),
      new Map<string, SingleAssetTwoPartyIntermediaryAgreement>(),
      // Note that this FreeBalance is undefined because a channel technically
      // does not have a FreeBalance before the `setup` protocol gets run
      undefined,
      1
    );
  }

  public addProposal(proposal: AppInstanceProposal) {
    const proposedAppInstances = new Map<string, AppInstanceProposal>(
      this.proposedAppInstances.entries()
    );

    proposedAppInstances.set(proposal.identityHash, proposal);

    return this.build({
      proposedAppInstances,
      monotonicNumProposedApps: this.monotonicNumProposedApps + 1
    });
  }

  public removeProposal(appInstanceId: string) {
    const proposedAppInstances = new Map<string, AppInstanceProposal>(
      this.proposedAppInstances.entries()
    );

    proposedAppInstances.delete(appInstanceId);

    return this.build({
      proposedAppInstances
    });
  }

  public addAppInstance(appInstance: AppInstance) {
    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(appInstance.identityHash, appInstance);

    return this.build({
      appInstances,
      monotonicNumProposedApps: this.monotonicNumProposedApps + 1
    });
  }

  public removeAppInstance(appInstanceId: string) {
    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.delete(appInstanceId);

    return this.build({
      appInstances
    });
  }

  public setState(appInstanceIdentityHash: string, state: SolidityValueType) {
    const appInstance = this.getAppInstance(appInstanceIdentityHash);

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(appInstanceIdentityHash, appInstance.setState(state));

    return this.build({
      appInstances
    });
  }

  public addSingleAssetTwoPartyIntermediaryAgreement(
    targetIdentityHash: string,
    agreement: SingleAssetTwoPartyIntermediaryAgreement,
    decrements: CoinTransferMap,
    tokenAddress: string
  ) {
    // Add to singleAssetTwoPartyIntermediaryAgreements

    const evaaInstances = new Map<
      string,
      SingleAssetTwoPartyIntermediaryAgreement
    >(this.singleAssetTwoPartyIntermediaryAgreements.entries());

    evaaInstances.set(targetIdentityHash, agreement);

    return this.build({
      singleAssetTwoPartyIntermediaryAgreements: evaaInstances
    }).addActiveAppAndIncrementFreeBalance(targetIdentityHash, {
      [tokenAddress]: flip(decrements)
    });
  }

  public removeSingleAssetTwoPartyIntermediaryAgreement(
    targetIdentityHash: string,
    increments: { [addr: string]: BigNumber },
    tokenAddress: string
  ) {
    const singleAssetTwoPartyIntermediaryAgreements = new Map<
      string,
      SingleAssetTwoPartyIntermediaryAgreement
    >(this.singleAssetTwoPartyIntermediaryAgreements.entries());

    if (!singleAssetTwoPartyIntermediaryAgreements.delete(targetIdentityHash)) {
      throw Error(
        `cannot find agreement with target hash ${targetIdentityHash}`
      );
    }

    return this.build({
      singleAssetTwoPartyIntermediaryAgreements
    }).removeActiveAppAndIncrementFreeBalance(targetIdentityHash, {
      [tokenAddress]: increments
    });
  }

  public installApp(
    appInstance: AppInstance,
    tokenIndexedDecrements: TokenIndexedCoinTransferMap
  ) {
    // Verify appInstance has expected signingkeys

    const participants = this.getSigningKeysFor(appInstance.appSeqNo);

    if (!participants.every((v, idx) => v === appInstance.participants[idx])) {
      throw Error(
        "AppInstance passed to installApp has incorrect participants"
      );
    }

    /// Add modified FB and new AppInstance to appInstances

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(appInstance.identityHash, appInstance);

    return this.build({
      appInstances
    }).addActiveAppAndIncrementFreeBalance(
      appInstance.identityHash,
      flipTokenIndexedBalances(tokenIndexedDecrements)
    );
  }

  public uninstallApp(
    appInstanceIdentityHash: string,
    tokenIndexedIncrements: TokenIndexedCoinTransferMap
  ) {
    const appToBeUninstalled = this.getAppInstance(appInstanceIdentityHash);

    if (appToBeUninstalled.identityHash !== appInstanceIdentityHash) {
      throw Error(
        `Consistency error: app stored under key ${appInstanceIdentityHash} has identityHah ${appToBeUninstalled.identityHash}`
      );
    }

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    if (!appInstances.delete(appToBeUninstalled.identityHash)) {
      throw Error(
        `Consistency error: managed to call get on ${appInstanceIdentityHash} but failed to call delete`
      );
    }

    return this.build({
      appInstances
    }).removeActiveAppAndIncrementFreeBalance(
      appInstanceIdentityHash,
      tokenIndexedIncrements
    );
  }

  public getSingleAssetTwoPartyIntermediaryAgreementFromVirtualApp(
    key: string
  ): SingleAssetTwoPartyIntermediaryAgreement {
    const ret = this.singleAssetTwoPartyIntermediaryAgreements.get(key);

    if (!ret) {
      throw Error(
        `Could not find any eth virtual app agreements with virtual app ${key}`
      );
    }

    return ret;
  }

  toJson(): StateChannelJSON {
    return {
      multisigAddress: this.multisigAddress,
      userNeuteredExtendedKeys: this.userNeuteredExtendedKeys,
      proposedAppInstances: [...this.proposedAppInstances.entries()].map(
        (proposal): [string, AppInstanceProposalJSON] => {
          return [proposal[0], proposal[1].toJson()];
        }
      ),
      appInstances: [...this.appInstances.entries()].map((appInstanceEntry): [
        string,
        AppInstanceJson
      ] => {
        return [appInstanceEntry[0], appInstanceEntry[1].toJson()];
      }),
      freeBalanceAppInstance: !!this.freeBalanceAppInstance
        ? this.freeBalanceAppInstance.toJson()
        : // Note that this FreeBalance is undefined because a channel technically
          // does not have a FreeBalance before the `setup` protocol gets run
          undefined,
      monotonicNumProposedApps: this.monotonicNumProposedApps,
      singleAssetTwoPartyIntermediaryAgreements: [
        ...this.singleAssetTwoPartyIntermediaryAgreements.entries()
      ].map(([key, val]) => [
        key,
        {
          ...val,
          capitalProvided: { _hex: val.capitalProvided.toHexString() }
        }
      ]),
      createdAt: this.createdAt
    };
  }

  static fromJson(json: StateChannelJSON): StateChannel {
    return new StateChannel(
      json.multisigAddress,
      json.userNeuteredExtendedKeys,
      new Map(
        [...Object.values(json.proposedAppInstances || [])].map((proposal): [
          string,
          AppInstanceProposal
        ] => {
          return [proposal[0], AppInstanceProposal.fromJson(proposal[1])];
        })
      ),
      new Map(
        [...Object.values(json.appInstances || [])].map((appInstanceEntry): [
          string,
          AppInstance
        ] => {
          return [
            appInstanceEntry[0],
            AppInstance.fromJson(appInstanceEntry[1])
          ];
        })
      ),
      new Map(
        (json.singleAssetTwoPartyIntermediaryAgreements || []).map(
          ([key, val]) => [
            key,
            {
              ...val,
              capitalProvided: bigNumberify(val.capitalProvided._hex)
            }
          ]
        )
      ),
      json.freeBalanceAppInstance
        ? AppInstance.fromJson(json.freeBalanceAppInstance)
        : undefined,
      json.monotonicNumProposedApps,
      json.createdAt
    );
  }

  static async getPeersAddressFromChannel(
    myIdentifier: string,
    store: Store,
    multisigAddress: string
  ): Promise<string[]> {
    const stateChannel = await store.getStateChannel(multisigAddress);
    const owners = stateChannel.userNeuteredExtendedKeys;
    return owners.filter(owner => owner !== myIdentifier);
  }

  static async getPeersAddressFromAppInstanceID(
    myIdentifier: string,
    store: Store,
    appInstanceId: string
  ): Promise<string[]> {
    const multisigAddress = await store.getMultisigAddressFromAppInstance(
      appInstanceId
    );

    return StateChannel.getPeersAddressFromChannel(
      myIdentifier,
      store,
      multisigAddress
    );
  }
}
