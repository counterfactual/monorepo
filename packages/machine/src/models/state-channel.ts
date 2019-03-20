import {
  AssetType,
  ETHBucketAppState,
  SolidityABIEncoderV2Struct
} from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { INSUFFICIENT_FUNDS } from "ethers/errors";
import { BigNumber, bigNumberify, formatEther } from "ethers/utils";

import {
  getETHBucketAppInterface,
  unlimitedETH
} from "../ethereum/utils/eth-bucket";
import { xkeyKthAddress, xkeysToSortedKthAddresses } from "../xkeys";

import { AppInstance, AppInstanceJson } from "./app-instance";
import {
  ETHVirtualAppAgreementInstance,
  ETHVirtualAppAgreementJson
} from "./eth-virtual-app-agreement-instance";

// TODO: Hmmm this code should probably be somewhere else?
const HARD_CODED_ASSUMPTIONS = {
  freeBalanceDefaultTimeout: 172800,
  freeBalanceInitialStateTimeout: 172800,
  // We assume the Free Balance is installed when the Root Nonce value is 0
  rootNonceValueAtFreeBalanceInstall: 0,
  // We assume the Free Balance is the first app ever installed
  appSequenceNumberForFreeBalance: 0
};

const NONCE_EXPIRY = 65536;

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

export type StateChannelJSON = {
  readonly multisigAddress: string;
  readonly userNeuteredExtendedKeys: string[];
  readonly appInstances: [string, AppInstanceJson][];
  readonly ETHVirtualAppAgreementInstances: [
    string,
    ETHVirtualAppAgreementJson
  ][];
  readonly freeBalanceAppIndexes: [number, string][];
  readonly monotonicNumInstalledApps: number;
  readonly rootNonceValue: number;
  readonly createdAt: number;
};

function createETHFreeBalance(
  multisigAddress: string,
  userNeuteredExtendedKeys: string[],
  ethBucketAddress: string,
  freeBalanceTimeout: number
) {
  const sortedTopLevelKeys = xkeysToSortedKthAddresses(
    userNeuteredExtendedKeys,
    0 // NOTE: We re-use 0 which is also used as the keys for `multisigOwners`
  );

  // Making these values constants to be extremely explicit about
  // the built-in assumption here.
  const beneficiaryForPerson1 = sortedTopLevelKeys[0];
  const beneficiaryForPerson2 = sortedTopLevelKeys[1];

  return new AppInstance(
    multisigAddress,
    sortedTopLevelKeys,
    freeBalanceTimeout,
    getETHBucketAppInterface(ethBucketAddress),
    unlimitedETH,
    false,
    HARD_CODED_ASSUMPTIONS.appSequenceNumberForFreeBalance,
    HARD_CODED_ASSUMPTIONS.rootNonceValueAtFreeBalanceInstall,
    {
      alice: beneficiaryForPerson1,
      bob: beneficiaryForPerson2,
      aliceBalance: Zero,
      bobBalance: Zero
    },
    0,
    HARD_CODED_ASSUMPTIONS.freeBalanceInitialStateTimeout
  );
}

export class StateChannel {
  constructor(
    public readonly multisigAddress: string,
    public readonly userNeuteredExtendedKeys: string[],
    readonly appInstances: ReadonlyMap<string, AppInstance> = new Map<
      string,
      AppInstance
    >([]),
    readonly ethVirtualAppAgreementInstances: ReadonlyMap<
      string,
      ETHVirtualAppAgreementInstance
    > = new Map<string, ETHVirtualAppAgreementInstance>([]),
    private readonly freeBalanceAppIndexes: ReadonlyMap<
      AssetType,
      string
    > = new Map<AssetType, string>([]),
    private readonly monotonicNumInstalledApps: number = 0,
    public readonly rootNonceValue: number = 0,
    public readonly createdAt: number = Date.now()
  ) {
    userNeuteredExtendedKeys.forEach(xpub => {
      if (xpub.slice(0, 4) !== "xpub") {
        throw Error(
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

  public getAppInstanceOfKind(address: string) {
    const appInstances = Array.from(this.appInstances.values()).filter(
      (appInstance: AppInstance) => {
        return appInstance.appInterface.addr === address;
      }
    );
    if (appInstances.length !== 1) {
      throw Error(
        `No AppInstance of addr ${address} exists on channel: ${
          this.multisigAddress
        }`
      );
    }
    return appInstances[0];
  }

  public appInstanceIsFreeBalance(appInstanceId: string): boolean {
    if (!this.hasAppInstance(appInstanceId)) {
      return false;
    }
    return new Set(this.freeBalanceAppIndexes.values()).has(appInstanceId);
  }

  public isAppInstanceInstalled(appInstanceIdentityHash: string) {
    return this.appInstances.has(appInstanceIdentityHash);
  }

  public hasFreeBalanceFor(assetType: AssetType): boolean {
    return this.freeBalanceAppIndexes.has(assetType);
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

  public getFreeBalanceFor(assetType: AssetType): AppInstance {
    if (!this.freeBalanceAppIndexes.has(assetType)) {
      throw Error(ERRORS.FREE_BALANCE_MISSING);
    }

    const idx = this.freeBalanceAppIndexes.get(assetType);

    if (idx === undefined || !this.appInstances.has(idx)) {
      throw Error(ERRORS.FREE_BALANCE_IDX_CORRUPT(idx!));
    }

    return this.appInstances.get(idx) as AppInstance;
  }

  public getFreeBalanceAddrOf(xpub: string, assetType: AssetType): string {
    const [alice, bob] = this.getFreeBalanceFor(assetType).signingKeys;

    const topLevelKey = xkeyKthAddress(xpub, 0);

    if (topLevelKey !== alice && topLevelKey !== bob) {
      throw Error(
        `getFreeBalanceAddrOf received invalid xpub without free balance account: ${xpub}`
      );
    }

    return topLevelKey;
  }

  // TODO: This is hard-coded to ETH presently
  public getFreeBalanceValueOf(xpub: string, assetType: AssetType) {
    const addr = this.getFreeBalanceAddrOf(xpub, assetType);
    const state = this.getFreeBalanceFor(assetType).state as ETHBucketAppState;

    if (state.alice === addr) {
      return state.aliceBalance;
    }

    if (state.bob === addr) {
      return state.bobBalance;
    }

    throw new Error(
      `getFreeBalanceValueOf could not find any value owned by ${xpub} for asset ${assetType}`
    );
  }

  public incrementFreeBalance(
    assetType: AssetType,
    increments: { [xpub: string]: BigNumber }
  ) {
    const freeBalance = this.getFreeBalanceFor(assetType);
    const freeBalanceState = freeBalance.state as ETHBucketAppState;

    for (const beneficiaryXpub in increments) {
      const beneficiaryAddress = this.getFreeBalanceAddrOf(
        beneficiaryXpub,
        AssetType.ETH
      );
      if (beneficiaryAddress === freeBalanceState.alice) {
        freeBalanceState.aliceBalance = bigNumberify(
          increments[beneficiaryXpub] || Zero
        ).add(freeBalanceState.aliceBalance);
      } else if (beneficiaryAddress === freeBalanceState.bob) {
        freeBalanceState.bobBalance = bigNumberify(
          increments[beneficiaryXpub] || Zero
        ).add(freeBalanceState.bobBalance);
      } else {
        throw Error(`No such beneficiary ${beneficiaryAddress} found`);
      }
    }

    return this.setState(freeBalance.identityHash, freeBalanceState);
  }

  public setFreeBalance(
    assetType: AssetType,
    newState: { [s: string]: BigNumber }
  ) {
    const freeBalance = this.getFreeBalanceFor(assetType);
    const freeBalanceState = freeBalance.state;
    for (const beneficiary in newState) {
      if (beneficiary === freeBalanceState.alice) {
        freeBalanceState.aliceBalance = newState[beneficiary];
      } else if (beneficiary === freeBalanceState.bob) {
        freeBalanceState.bobBalance = newState[beneficiary];
      } else {
        throw Error(`No such beneficiary ${beneficiary} found`);
      }
    }
    return this.setState(freeBalance.identityHash, freeBalanceState);
  }

  public static setupChannel(
    ethBucketAddress: string,
    multisigAddress: string,
    userNeuteredExtendedKeys: string[],
    freeBalanceTimeout?: number
  ) {
    const fb = createETHFreeBalance(
      multisigAddress,
      userNeuteredExtendedKeys,
      ethBucketAddress,
      freeBalanceTimeout || HARD_CODED_ASSUMPTIONS.freeBalanceDefaultTimeout
    );

    const appInstances = new Map<string, AppInstance>([[fb.identityHash, fb]]);

    const freeBalanceAppIndexes = new Map<AssetType, string>([
      [AssetType.ETH, fb.identityHash]
    ]);

    return new StateChannel(
      multisigAddress,
      userNeuteredExtendedKeys,
      appInstances,
      new Map<string, ETHVirtualAppAgreementInstance>(),
      freeBalanceAppIndexes,
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
      new Map<string, ETHVirtualAppAgreementInstance>(),
      new Map<AssetType, string>(),
      1
    );
  }

  public addVirtualAppInstance(appInstance: AppInstance) {
    if (appInstance.appSeqNo !== this.numInstalledApps) {
      throw Error(
        `Tried to install app with sequence number ${
          appInstance.appSeqNo
        } into channel with ${this.numInstalledApps} active apps`
      );
    }
    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(appInstance.identityHash, appInstance);

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      this.ethVirtualAppAgreementInstances,
      this.freeBalanceAppIndexes,
      this.monotonicNumInstalledApps + 1,
      this.rootNonceValue,
      this.createdAt
    );
  }

  public setState(
    appInstanceIdentityHash: string,
    state: SolidityABIEncoderV2Struct
  ) {
    const appInstance = this.getAppInstance(appInstanceIdentityHash);

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(appInstanceIdentityHash, appInstance.setState(state));

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      this.ethVirtualAppAgreementInstances,
      this.freeBalanceAppIndexes,
      this.monotonicNumInstalledApps,
      this.rootNonceValue,
      this.createdAt
    );
  }

  public lockAppInstance(appInstanceIdentityHash: string) {
    const appInstance = this.getAppInstance(appInstanceIdentityHash);

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(
      appInstanceIdentityHash,
      appInstance.lockState(NONCE_EXPIRY)
    );

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      this.ethVirtualAppAgreementInstances,
      this.freeBalanceAppIndexes,
      this.monotonicNumInstalledApps,
      this.rootNonceValue,
      this.createdAt
    );
  }

  public installETHVirtualAppAgreementInstance(
    evaaInstance: ETHVirtualAppAgreementInstance,
    targetIdentityHash: string,
    aliceBalanceDecrement: BigNumber,
    bobBalanceDecrement: BigNumber
  ) {
    /// Decrement from FB

    const fb = this.getFreeBalanceFor(AssetType.ETH);
    const {
      alice,
      aliceBalance,
      bob,
      bobBalance
    } = fb.state as ETHBucketAppState;

    const updatedAliceBalance = aliceBalance.sub(aliceBalanceDecrement);
    const updatedBobBalance = bobBalance.sub(bobBalanceDecrement);

    if (updatedAliceBalance.lt(Zero)) {
      throw Error(
        `${alice} cannot install virtual app agreement instance. Its balance in channel with ${bob} is insufficient by ${formatEther(
          aliceBalance.sub(updatedAliceBalance)
        )}`
      );
    }
    if (updatedBobBalance.lt(Zero)) {
      throw Error(
        `\n${bob} cannot install virtual app agreement instance. Its balance in channel with ${alice} is insufficient ${formatEther(
          bobBalance.sub(updatedBobBalance)
        )}`
      );
    }

    /// Add modified FB to appInstances

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(
      fb.identityHash,
      fb.setState({
        ...fb.state,
        aliceBalance: updatedAliceBalance,
        bobBalance: updatedBobBalance
      })
    );

    // Add to ethVirtualAppAgreementInstances

    const evaaInstances = new Map<string, ETHVirtualAppAgreementInstance>(
      this.ethVirtualAppAgreementInstances.entries()
    );

    evaaInstances.set(targetIdentityHash, evaaInstance);

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      evaaInstances,
      this.freeBalanceAppIndexes,
      this.monotonicNumInstalledApps + 1,
      this.rootNonceValue,
      this.createdAt
    );
  }

  public uninstallETHVirtualAppAgreementInstance(
    targetIdentityHash: string,
    increments: { [xpub: string]: BigNumber }
  ) {
    const ethVirtualAppAgreementInstances = new Map<
      string,
      ETHVirtualAppAgreementInstance
    >(this.ethVirtualAppAgreementInstances.entries());

    if (!ethVirtualAppAgreementInstances.delete(targetIdentityHash)) {
      throw Error(
        `cannot find agreement with target hash ${targetIdentityHash}`
      );
    }

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      this.appInstances,
      ethVirtualAppAgreementInstances,
      this.freeBalanceAppIndexes,
      this.monotonicNumInstalledApps,
      this.rootNonceValue,
      this.createdAt
    ).incrementFreeBalance(AssetType.ETH, increments);
  }

  public removeVirtualApp(targetIdentityHash: string) {
    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.delete(targetIdentityHash);

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      this.ethVirtualAppAgreementInstances,
      this.freeBalanceAppIndexes,
      this.monotonicNumInstalledApps,
      this.rootNonceValue,
      this.createdAt
    );
  }

  public installApp(
    appInstance: AppInstance,
    aliceBalanceDecrement: BigNumber,
    bobBalanceDecrement: BigNumber
  ) {
    /// Decrement from FB

    const fb = this.getFreeBalanceFor(AssetType.ETH);
    const currentFBState = fb.state as ETHBucketAppState;

    const aliceBalance = currentFBState.aliceBalance.sub(aliceBalanceDecrement);
    const bobBalance = currentFBState.bobBalance.sub(bobBalanceDecrement);

    if (aliceBalance.lt(Zero) || bobBalance.lt(Zero)) {
      throw Error(INSUFFICIENT_FUNDS);
    }

    // Verify appInstance has expected signingkeys

    if (appInstance.appSeqNo !== this.monotonicNumInstalledApps) {
      throw Error("AppInstance passed to installApp has incorrect appSeqNo");
    } else {
      const signingKeys = this.getSigningKeysFor(appInstance.appSeqNo);
      if (!signingKeys.every((v, idx) => v === appInstance.signingKeys[idx])) {
        throw Error(
          "AppInstance passed to installApp has incorrect signingKeys"
        );
      }
    }

    /// Add modified FB and new AppInstance to appInstances

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances
      .set(appInstance.identityHash, appInstance)
      .set(
        fb.identityHash,
        fb.setState({ ...currentFBState, aliceBalance, bobBalance })
      );

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      this.ethVirtualAppAgreementInstances,
      this.freeBalanceAppIndexes,
      this.monotonicNumInstalledApps + 1,
      this.rootNonceValue,
      this.createdAt
    );
  }

  /// todo(xuanji): refactor this so that the public API does not expose
  /// {alice,bob}BalanceIncrement, since this often requires the caller to sort
  /// addresses
  public uninstallApp(
    appInstanceIdentityHash: string,
    aliceBalanceIncrement: BigNumber = Zero,
    bobBalanceIncrement: BigNumber = Zero
  ) {
    const fb = this.getFreeBalanceFor(AssetType.ETH);
    const appToBeUninstalled = this.getAppInstance(appInstanceIdentityHash);

    if (appToBeUninstalled.identityHash !== appInstanceIdentityHash) {
      throw Error(
        `Consistency error: app stored under key ${appInstanceIdentityHash} has identityHah ${
          appToBeUninstalled.identityHash
        }`
      );
    }

    const currentState = fb.state as ETHBucketAppState;

    const aliceBalance = currentState.aliceBalance.add(aliceBalanceIncrement);
    const bobBalance = currentState.bobBalance.add(bobBalanceIncrement);

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    if (!appInstances.delete(appToBeUninstalled.identityHash)) {
      throw Error(
        `Consistency error: managed to call get on ${appInstanceIdentityHash} but failed to call delete`
      );
    }

    appInstances.set(
      fb.identityHash,
      fb.setState({ ...currentState, aliceBalance, bobBalance })
    );

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      this.ethVirtualAppAgreementInstances,
      this.freeBalanceAppIndexes,
      this.monotonicNumInstalledApps,
      this.rootNonceValue,
      this.createdAt
    );
  }

  public getETHVirtualAppAgreementInstanceFromTarget(
    target: string
  ): ETHVirtualAppAgreementInstance {
    for (const [{}, instance] of this.ethVirtualAppAgreementInstances) {
      if (instance.targetAppIdentityHash === target) {
        return instance;
      }
    }
    throw Error(
      `Could not find any eth virtual app agreements with target ${target}`
    );
  }

  toJson(): StateChannelJSON {
    return {
      multisigAddress: this.multisigAddress,
      userNeuteredExtendedKeys: this.userNeuteredExtendedKeys,
      appInstances: [...this.appInstances.entries()].map(
        (appInstanceEntry): [string, AppInstanceJson] => {
          return [appInstanceEntry[0], appInstanceEntry[1].toJson()];
        }
      ),
      freeBalanceAppIndexes: Array.from(this.freeBalanceAppIndexes.entries()),
      monotonicNumInstalledApps: this.monotonicNumInstalledApps,
      ETHVirtualAppAgreementInstances: [
        ...this.ethVirtualAppAgreementInstances.entries()
      ].map(
        (appInstanceEntry): [string, ETHVirtualAppAgreementJson] => {
          return [appInstanceEntry[0], appInstanceEntry[1].toJson()];
        }
      ),
      rootNonceValue: this.rootNonceValue,
      createdAt: this.createdAt
    };
  }

  static fromJson(json: StateChannelJSON): StateChannel {
    return new StateChannel(
      json.multisigAddress,
      json.userNeuteredExtendedKeys,
      new Map(
        [...Object.values(json.appInstances || [])].map(
          (appInstanceEntry): [string, AppInstance] => {
            return [
              appInstanceEntry[0],
              AppInstance.fromJson(appInstanceEntry[1])
            ];
          }
        )
      ),
      new Map(
        [...Object.values(json.ETHVirtualAppAgreementInstances || [])].map(
          (appInstanceEntry): [string, ETHVirtualAppAgreementInstance] => {
            return [
              appInstanceEntry[0],
              ETHVirtualAppAgreementInstance.fromJson(appInstanceEntry[1])
            ];
          }
        )
      ),
      new Map(json.freeBalanceAppIndexes),
      json.monotonicNumInstalledApps,
      json.rootNonceValue,
      json.createdAt
    );
  }
}
