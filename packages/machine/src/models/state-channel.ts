import {
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { INSUFFICIENT_FUNDS } from "ethers/errors";
import { BigNumber } from "ethers/utils";

import {
  freeBalanceTerms,
  getFreeBalanceAppInterface
} from "../ethereum/utils/free-balance";

import { AppInstance } from "./app-instance";

// TODO: Hmmm this code should probably be somewhere else?
const HARD_CODED_ASSUMPTIONS = {
  freeBalanceDefaultTimeout: 100,
  freeBalanceInitialStateTimeout: 100,
  appSequenceNumberForFreeBalance: 0
};

const ERRORS = {
  APPS_NOT_EMPTY: size =>
    `Expected the appInstances list to be empty but size ${size}`,
  APP_DOES_NOT_EXIST: id =>
    `Attempted to edit an appInstance that does not exist: id = ${id}`,
  FREE_BALANCE_MISSING: "Cannot find ETH Free Balance App in StateChannel",
  FREE_BALANCE_IDX_CORRUPT: idx =>
    `Index ${idx} used to find ETH Free Balance is broken`,
  INSUFFICIENT_FUNDS:
    "Attempted to install an appInstance without sufficient funds"
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
    private readonly appInstances: Readonly<Map<string, AppInstance>> = new Map<
      string,
      AppInstance
    >([]),
    private readonly freeBalanceAppIndexes: Readonly<
      Map<AssetType, string>
    > = new Map<AssetType, string>([]),
    private readonly monotonicNumInstalledApps: number = 0
  ) {}

  public get numInstalledApps() {
    return this.monotonicNumInstalledApps;
  }

  public get numActiveApps() {
    return this.appInstances.size;
  }

  public getAppInstance(appInstanceId: string): AppInstance {
    if (!this.appInstances.has(appInstanceId)) {
      throw Error(`${ERRORS.APP_DOES_NOT_EXIST}({appInstance.id})`);
    }
    return this.appInstances.get(appInstanceId)!;
  }

  public isAppInstanceInstalled(appInstanceId: string) {
    return this.appInstances.has(appInstanceId);
  }

  public getFreeBalanceFor(assetType: AssetType): AppInstance {
    if (!this.freeBalanceAppIndexes.has(assetType)) {
      throw Error(ERRORS.FREE_BALANCE_MISSING);
    }

    const idx = this.freeBalanceAppIndexes.get(assetType);

    if (!this.appInstances.has(idx!)) {
      throw Error(`${ERRORS.FREE_BALANCE_IDX_CORRUPT}({idx})`);
    }

    return this.appInstances.get(idx!)!;
  }

  public setupChannel(network: NetworkContext) {
    const size = this.appInstances.size;

    if (size > 0) throw Error(`${ERRORS.APPS_NOT_EMPTY}({size})`);

    const fb = createETHFreeBalance(
      this.multisigAddress,
      this.multisigOwners,
      network.ETHBucket
    );

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    const freeBalanceAppIndexes = new Map<AssetType, string>(
      this.freeBalanceAppIndexes.entries()
    );

    appInstances.set(fb.id, fb);

    freeBalanceAppIndexes.set(AssetType.ETH, fb.id);

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      appInstances,
      freeBalanceAppIndexes,
      this.monotonicNumInstalledApps + 1
    );
  }

  public setState(appInstanceId: string, state: object) {
    const appInstance = this.getAppInstance(appInstanceId);

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    const freeBalanceAppIndexes = new Map<AssetType, string>(
      this.freeBalanceAppIndexes.entries()
    );

    appInstances.set(appInstanceId, appInstance.setState(state));

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      appInstances,
      freeBalanceAppIndexes,
      this.monotonicNumInstalledApps
    );
  }

  public installApp(
    appInstance: AppInstance,
    aliceBalanceDecrement: BigNumber,
    bobBalanceDecrement: BigNumber
  ) {
    const fb = this.getFreeBalanceFor(AssetType.ETH);
    const currentState = fb.state as ETHBucketAppState;

    const aliceBalance = currentState.aliceBalance.sub(aliceBalanceDecrement);
    const bobBalance = currentState.bobBalance.sub(bobBalanceDecrement);

    if (aliceBalance.lt(Zero) || bobBalance.lt(Zero)) {
      throw Error(INSUFFICIENT_FUNDS);
    }

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    const freeBalanceAppIndexes = new Map<AssetType, string>(
      this.freeBalanceAppIndexes.entries()
    );

    appInstances
      .set(appInstance.id, appInstance)
      .set(fb.id, fb.setState({ ...currentState, aliceBalance, bobBalance }));

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      appInstances,
      freeBalanceAppIndexes,
      this.monotonicNumInstalledApps + 1
    );
  }

  public uninstallApp(
    appInstanceId: string,
    aliceBalanceIncrement: BigNumber,
    bobBalanceIncrement: BigNumber
  ) {
    const fb = this.getFreeBalanceFor(AssetType.ETH);
    const appToBeUninstalled = this.getAppInstance(appInstanceId);

    const currentState = fb.state as ETHBucketAppState;

    const aliceBalance = currentState.aliceBalance.sub(aliceBalanceIncrement);
    const bobBalance = currentState.bobBalance.sub(bobBalanceIncrement);

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    const freeBalanceAppIndexes = new Map<AssetType, string>(
      this.freeBalanceAppIndexes.entries()
    );

    appInstances.delete(appToBeUninstalled.id);

    appInstances.set(
      fb.id,
      fb.setState({ ...currentState, aliceBalance, bobBalance })
    );

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      appInstances,
      freeBalanceAppIndexes,
      this.monotonicNumInstalledApps
    );
  }
}
