import {
  AppState,
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { INSUFFICIENT_FUNDS } from "ethers/errors";
import { BigNumber, bigNumberify } from "ethers/utils";

import {
  freeBalanceTerms,
  getFreeBalanceAppInterface
} from "../ethereum/utils/free-balance";

import { AppInstance, AppInstanceJson } from "./app-instance";
import {
  ETHVirtualAppAgreementInstance,
  ETHVirtualAppAgreementJson
} from "./eth-virtual-app-agreement-instance";

// TODO: Hmmm this code should probably be somewhere else?
const HARD_CODED_ASSUMPTIONS = {
  freeBalanceDefaultTimeout: 10,
  freeBalanceInitialStateTimeout: 10,
  // We assume the Free Balance is installed when the Root Nonce value is 0
  rootNonceValueAtFreeBalanceInstall: 0,
  // We assume the Free Balance is the first app ever installed
  appSequenceNumberForFreeBalance: 0
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
    "Attempted to install an appInstance without sufficient funds"
};

export type StateChannelJSON = {
  readonly multisigAddress: string;
  readonly multisigOwners: string[];
  readonly appInstances: [string, AppInstanceJson][];
  readonly ETHVirtualAppAgreementInstances: [
    string,
    ETHVirtualAppAgreementJson
  ][];
  readonly freeBalanceAppIndexes: [number, string][];
  readonly monotonicNumInstalledApps: number;
};

function createETHFreeBalance(
  multisigAddress: string,
  multisigOwners: string[],
  ethBucketAddress: string
) {
  // Making these values constants to be extremely explicit about
  // the built-in assumption here.
  const signingKeyForFreeBalanceForPerson1 = multisigOwners[0];
  const signingKeyForFreeBalanceForPerson2 = multisigOwners[1];

  return new AppInstance(
    multisigAddress,
    multisigOwners,
    HARD_CODED_ASSUMPTIONS.freeBalanceDefaultTimeout,
    getFreeBalanceAppInterface(ethBucketAddress),
    freeBalanceTerms,
    false,
    HARD_CODED_ASSUMPTIONS.appSequenceNumberForFreeBalance,
    HARD_CODED_ASSUMPTIONS.rootNonceValueAtFreeBalanceInstall,
    {
      alice: signingKeyForFreeBalanceForPerson1,
      bob: signingKeyForFreeBalanceForPerson2,
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
    public readonly multisigOwners: string[],
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
    public readonly rootNonceValue: number = 0
  ) {}

  public get numInstalledApps() {
    return this.monotonicNumInstalledApps;
  }

  public get numActiveApps() {
    return this.appInstances.size;
  }

  public getAppInstance(appInstanceIdentityHash: string): AppInstance {
    if (!this.appInstances.has(appInstanceIdentityHash)) {
      throw Error(`${ERRORS.APP_DOES_NOT_EXIST(appInstanceIdentityHash)}`);
    }
    return this.appInstances.get(appInstanceIdentityHash)!;
  }

  public hasAppInstance(appInstanceId: string): boolean {
    return this.appInstances.has(appInstanceId);
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

  public getFreeBalanceFor(assetType: AssetType): AppInstance {
    if (!this.freeBalanceAppIndexes.has(assetType)) {
      throw Error(ERRORS.FREE_BALANCE_MISSING);
    }

    const idx = this.freeBalanceAppIndexes.get(assetType);

    if (!this.appInstances.has(idx!)) {
      throw Error(`${ERRORS.FREE_BALANCE_IDX_CORRUPT(idx!)}`);
    }

    const appInstanceJson = this.appInstances.get(idx!)!.toJson();
    appInstanceJson.latestState = {
      ...appInstanceJson.latestState,
      aliceBalance: bigNumberify(appInstanceJson.latestState.aliceBalance),
      bobBalance: bigNumberify(appInstanceJson.latestState.bobBalance)
    };

    return AppInstance.fromJson(appInstanceJson);
  }

  public setFreeBalanceFor(
    assetType: AssetType,
    state: AppState
  ): StateChannel {
    const freeBalance = this.getFreeBalanceFor(assetType);
    return this.setState(freeBalance.identityHash, state);
  }

  public setupChannel(network: NetworkContext) {
    const size = this.appInstances.size;

    if (size > 0) throw Error(`${ERRORS.APPS_NOT_EMPTY(size)})`);

    const fb = createETHFreeBalance(
      this.multisigAddress,
      this.multisigOwners,
      network.ETHBucket
    );

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );
    appInstances.set(fb.identityHash, fb);

    const freeBalanceAppIndexes = new Map<AssetType, string>(
      this.freeBalanceAppIndexes.entries()
    );
    freeBalanceAppIndexes.set(AssetType.ETH, fb.identityHash);

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      appInstances,
      this.ethVirtualAppAgreementInstances,
      freeBalanceAppIndexes,
      this.monotonicNumInstalledApps + 1
    );
  }

  public setState(appInstanceIdentityHash: string, state: AppState) {
    const appInstance = this.getAppInstance(appInstanceIdentityHash);

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(appInstanceIdentityHash, appInstance.setState(state));

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      appInstances,
      this.ethVirtualAppAgreementInstances,
      this.freeBalanceAppIndexes,
      this.monotonicNumInstalledApps
    );
  }

  public installETHVirtualAppAgreementInstance(
    evaaInstance: ETHVirtualAppAgreementInstance,
    aliceBalanceDecrement: BigNumber,
    bobBalanceDecrement: BigNumber
  ) {
    /// Decrement from FB

    const fb = this.getFreeBalanceFor(AssetType.ETH);
    const currentFBState = fb.state;

    const aliceBalance = currentFBState.aliceBalance.sub(aliceBalanceDecrement);
    const bobBalance = currentFBState.bobBalance.sub(bobBalanceDecrement);

    if (aliceBalance.lt(Zero) || bobBalance.lt(Zero)) {
      throw Error(INSUFFICIENT_FUNDS);
    }

    /// Add modified FB to appInstances

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(
      fb.identityHash,
      fb.setState({ ...currentFBState, aliceBalance, bobBalance })
    );

    // Add to ethVirtualAppAgreementInstances

    const evaaInstances = new Map<string, ETHVirtualAppAgreementInstance>(
      this.ethVirtualAppAgreementInstances.entries()
    );

    // todo(ldct: what key?)
    evaaInstances.set("", evaaInstance);

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      this.appInstances,
      evaaInstances,
      this.freeBalanceAppIndexes,
      this.monotonicNumInstalledApps + 1
    );
  }

  public installApp(
    appInstance: AppInstance,
    aliceBalanceDecrement: BigNumber,
    bobBalanceDecrement: BigNumber
  ) {
    /// Decrement from FB

    const fb = this.getFreeBalanceFor(AssetType.ETH);
    const currentFBState = fb.state;

    const aliceBalance = currentFBState.aliceBalance.sub(aliceBalanceDecrement);
    const bobBalance = currentFBState.bobBalance.sub(bobBalanceDecrement);

    if (aliceBalance.lt(Zero) || bobBalance.lt(Zero)) {
      throw Error(INSUFFICIENT_FUNDS);
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
      this.multisigOwners,
      appInstances,
      this.ethVirtualAppAgreementInstances,
      this.freeBalanceAppIndexes,
      this.monotonicNumInstalledApps + 1
    );
  }

  public uninstallApp(
    appInstanceIdentityHash: string,
    aliceBalanceIncrement: BigNumber,
    bobBalanceIncrement: BigNumber
  ) {
    const fb = this.getFreeBalanceFor(AssetType.ETH);
    const appToBeUninstalled = this.getAppInstance(appInstanceIdentityHash);

    const currentState = fb.state as ETHBucketAppState;

    const aliceBalance = currentState.aliceBalance.sub(aliceBalanceIncrement);
    const bobBalance = currentState.bobBalance.sub(bobBalanceIncrement);

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.delete(appToBeUninstalled.identityHash);

    appInstances.set(
      fb.identityHash,
      fb.setState({ ...currentState, aliceBalance, bobBalance })
    );

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      appInstances,
      this.ethVirtualAppAgreementInstances,
      this.freeBalanceAppIndexes,
      this.monotonicNumInstalledApps
    );
  }

  toJson(): StateChannelJSON {
    return {
      multisigAddress: this.multisigAddress,
      multisigOwners: this.multisigOwners,
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
      )
    };
  }

  static fromJson(json: StateChannelJSON): StateChannel {
    return new StateChannel(
      json.multisigAddress,
      json.multisigOwners,
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
      json.monotonicNumInstalledApps
    );
  }
}
