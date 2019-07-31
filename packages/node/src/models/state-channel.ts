import {
  AppInstanceJson,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { BigNumber, bigNumberify } from "ethers/utils";

import {
  flip,
  flipTokenIndexedBalances,
  merge
} from "../ethereum/utils/free-balance-app";
import { xkeyKthAddress } from "../machine/xkeys";

import { AppInstance } from "./app-instance";
import {
  CoinTransferMap,
  createFreeBalance,
  deserializeFreeBalanceState,
  FreeBalanceState,
  FreeBalanceStateJSON,
  getBalancesFromFreeBalanceAppInstance,
  serializeFreeBalanceState,
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
  readonly appInstances: [string, AppInstanceJson][];
  readonly singleAssetTwoPartyIntermediaryAgreements: [
    string,
    SingleAssetTwoPartyIntermediaryAgreementJSON
  ][];
  readonly freeBalanceAppInstance: AppInstanceJson | undefined;
  readonly monotonicNumInstalledApps: number;
  readonly createdAt: number;
};

export class StateChannel {
  constructor(
    public readonly multisigAddress: string,
    public readonly userNeuteredExtendedKeys: string[],
    readonly appInstances: ReadonlyMap<string, AppInstance> = new Map<
      string,
      AppInstance
    >([]),
    readonly singleAssetTwoPartyIntermediaryAgreements: ReadonlyMap<
      string,
      SingleAssetTwoPartyIntermediaryAgreement
    > = new Map<string, SingleAssetTwoPartyIntermediaryAgreement>([]),
    private readonly freeBalanceAppInstance?: AppInstance,
    private readonly monotonicNumInstalledApps: number = 0,
    public readonly createdAt: number = Date.now()
  ) {
    userNeuteredExtendedKeys.forEach(xpub => {
      if (xpub.slice(0, 4) !== "xpub") {
        throw new Error(
          `StateChannel constructor given invalid extended keys: ${userNeuteredExtendedKeys}`
        );
      }
    });
  }

  public get multisigOwners() {
    return this.getSigningKeysFor(0);
  }

  public get numInstalledApps() {
    return this.monotonicNumInstalledApps;
  }

  public get numActiveApps() {
    return this.appInstances.size;
  }

  public getAppInstance(appInstanceIdentityHash: string): AppInstance {
    if (!this.appInstances.has(appInstanceIdentityHash)) {
      throw new Error(ERRORS.APP_DOES_NOT_EXIST(appInstanceIdentityHash));
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
      throw new Error(
        "There are no installed AppInstances in this StateChannel"
      );
    }
    return [...this.appInstances.values()].reduce((prev, current) =>
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
      throw new Error(
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
    return this.getSigningKeysFor(this.monotonicNumInstalledApps);
  }

  public get freeBalance(): AppInstance {
    if (this.freeBalanceAppInstance) {
      return this.freeBalanceAppInstance;
    }

    throw new Error(
      "There is no free balance app instance installed in this state channel"
    );
  }

  public getMultisigOwnerAddrOf(xpub: string): string {
    const [alice, bob] = this.multisigOwners;

    const topLevelKey = xkeyKthAddress(xpub, 0);

    if (topLevelKey !== alice && topLevelKey !== bob) {
      throw new Error(
        `getMultisigOwnerAddrOf received invalid xpub not in multisigOwners: ${xpub}`
      );
    }

    return topLevelKey;
  }

  public getFreeBalanceAddrOf(xpub: string): string {
    const [alice, bob] = this.freeBalanceAppInstance!.participants;

    const topLevelKey = xkeyKthAddress(xpub, 0);

    if (topLevelKey !== alice && topLevelKey !== bob) {
      throw new Error(
        `getFreeBalanceAddrOf received invalid xpub without free balance account: ${xpub}`
      );
    }

    return topLevelKey;
  }

  private build(args: {
    multisigAddress?: string;
    userNeuteredExtendedKeys?: string[];
    appInstances?: ReadonlyMap<string, AppInstance>;
    singleAssetTwoPartyIntermediaryAgreements?: ReadonlyMap<
      string,
      SingleAssetTwoPartyIntermediaryAgreement
    >;
    freeBalanceAppInstance?: AppInstance;
    monotonicNumInstalledApps?: number;
    createdAt?: number;
  }) {
    return new StateChannel(
      args.multisigAddress || this.multisigAddress,
      args.userNeuteredExtendedKeys || this.userNeuteredExtendedKeys,
      args.appInstances || this.appInstances,
      args.singleAssetTwoPartyIntermediaryAgreements ||
        this.singleAssetTwoPartyIntermediaryAgreements,
      args.freeBalanceAppInstance || this.freeBalanceAppInstance,
      args.monotonicNumInstalledApps || this.monotonicNumInstalledApps,
      args.createdAt || this.createdAt
    );
  }

  public incrementFreeBalance(increments: TokenIndexedCoinTransferMap) {
    const json = this.freeBalance.state as FreeBalanceStateJSON;

    const freeBalanceState = deserializeFreeBalanceState(json);

    for (const tokenAddress of Object.keys(increments)) {
      freeBalanceState.balancesIndexedByToken[tokenAddress] = Object.entries(
        merge(
          getBalancesFromFreeBalanceAppInstance(this.freeBalance, tokenAddress),
          increments[tokenAddress]
        )
      ).map(([to, amount]) => ({ to, amount }));
    }

    return this.build({
      freeBalanceAppInstance: this.freeBalance.setState(
        serializeFreeBalanceState(freeBalanceState)
      )
    });
  }

  public addActiveApp(activeApp: string) {
    const json = this.freeBalance.state as FreeBalanceStateJSON;

    const freeBalanceState = deserializeFreeBalanceState(json);

    freeBalanceState.activeAppsMap[activeApp] = true;

    return this.build({
      freeBalanceAppInstance: this.freeBalance.setState(
        serializeFreeBalanceState(freeBalanceState)
      )
    });
  }

  public removeActiveApp(activeApp: string) {
    const json = this.freeBalance.state as FreeBalanceStateJSON;

    const freeBalanceState = deserializeFreeBalanceState(json);

    if (!freeBalanceState.activeAppsMap[activeApp]) {
      throw new Error(
        "Cannot uninstall app that is not installed in the first place"
      );
    }

    delete freeBalanceState.activeAppsMap[activeApp];

    return this.build({
      freeBalanceAppInstance: this.freeBalance.setState(
        serializeFreeBalanceState(freeBalanceState)
      )
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

  public setFreeBalance(newState: FreeBalanceState) {
    return this.build({
      freeBalanceAppInstance: this.freeBalance.setState(
        serializeFreeBalanceState(newState)
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
      new Map<string, AppInstance>([]),
      new Map<string, SingleAssetTwoPartyIntermediaryAgreement>(),
      createFreeBalance(
        multisigAddress,
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
      new Map<string, AppInstance>(),
      new Map<string, SingleAssetTwoPartyIntermediaryAgreement>(),
      // Note that this FreeBalance is undefined because a channel technically
      // does not have a FreeBalance before the `setup` protocol gets run
      undefined,
      1
    );
  }

  public addAppInstance(appInstance: AppInstance) {
    if (appInstance.appSeqNo !== this.numInstalledApps) {
      throw new Error(
        `Tried to install app with sequence number ${appInstance.appSeqNo} into channel with ${this.numInstalledApps} active apps`
      );
    }
    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(appInstance.identityHash, appInstance);

    return this.build({
      appInstances,
      monotonicNumInstalledApps: this.monotonicNumInstalledApps + 1
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

  public setState(
    appInstanceIdentityHash: string,
    state: SolidityABIEncoderV2Type
  ) {
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
      throw new Error(
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

    if (appInstance.appSeqNo !== this.monotonicNumInstalledApps) {
      throw new Error(
        "AppInstance passed to installApp has incorrect appSeqNo"
      );
    } else {
      const participants = this.getSigningKeysFor(appInstance.appSeqNo);
      if (
        !participants.every((v, idx) => v === appInstance.participants[idx])
      ) {
        throw new Error(
          "AppInstance passed to installApp has incorrect participants"
        );
      }
    }

    /// Add modified FB and new AppInstance to appInstances

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(appInstance.identityHash, appInstance);

    return this.build({
      appInstances,
      monotonicNumInstalledApps: this.monotonicNumInstalledApps + 1
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
      throw new Error(
        `Consistency error: app stored under key ${appInstanceIdentityHash} has identityHah ${appToBeUninstalled.identityHash}`
      );
    }

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    if (!appInstances.delete(appToBeUninstalled.identityHash)) {
      throw new Error(
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
      throw new Error(
        `Could not find any eth virtual app agreements with virtual app ${key}`
      );
    }

    return ret;
  }

  toJson(): StateChannelJSON {
    return {
      multisigAddress: this.multisigAddress,
      userNeuteredExtendedKeys: this.userNeuteredExtendedKeys,
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
      monotonicNumInstalledApps: this.monotonicNumInstalledApps,
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
      json.monotonicNumInstalledApps,
      json.createdAt
    );
  }
}
