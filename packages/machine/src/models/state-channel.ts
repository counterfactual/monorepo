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

const enum Errors {
  APPS_NOT_EMPTY = "Expected the appInstances list to be empty but size was nonzero",
  APP_DOES_NOT_EXIST = "Attempted to edit an appInstance that does not exist",
  FREE_BALANCE_MISSING = "Cannot find ETH Free Balance App in StateChannel",
  FREE_BALANCE_IDX_CORRUPT = "Index used to find ETH Free Balance is broken",
  INSUFFICIENT_FUNDS = "Attempted to install an appInstance without sufficient funds"
}

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
    private readonly monotonicallyIncreasingSeqNo: number = 0
  ) {}

  public get sequenceNumber() {
    return this.monotonicallyIncreasingSeqNo;
  }

  public get numberOfApps() {
    return this.appInstances.size;
  }

  public getAppInstance(appInstanceId: string) {
    const appInstance = this.appInstances.get(appInstanceId);

    if (appInstance === undefined) throw Error(Errors.APP_DOES_NOT_EXIST);

    return appInstance;
  }

  public isAppInstanceInstalled(appInstanceId: string) {
    return this.appInstances.get(appInstanceId) !== undefined;
  }

  public getFreeBalanceFor(assetType: AssetType) {
    const idx = this.freeBalanceAppIndexes.get(assetType);

    if (!idx) throw Error(Errors.FREE_BALANCE_MISSING);

    const fb = this.appInstances.get(idx);

    if (!fb) throw Error(Errors.FREE_BALANCE_IDX_CORRUPT);

    return fb;
  }

  public setupChannel(network: NetworkContext) {
    if (this.appInstances.size !== 0) throw Error(Errors.APPS_NOT_EMPTY);

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

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      appInstances.set(fb.id, fb),
      freeBalanceAppIndexes.set(AssetType.ETH, fb.id),
      this.monotonicallyIncreasingSeqNo + 1
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

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      appInstances.set(appInstanceId, appInstance.setState(state)),
      freeBalanceAppIndexes,
      this.monotonicallyIncreasingSeqNo
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

    if (aliceBalance.lt(Zero)) throw Error(INSUFFICIENT_FUNDS);
    if (bobBalance.lt(Zero)) throw Error(INSUFFICIENT_FUNDS);

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    const freeBalanceAppIndexes = new Map<AssetType, string>(
      this.freeBalanceAppIndexes.entries()
    );

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      appInstances
        .set(appInstance.id, appInstance)
        .set(fb.id, fb.setState({ ...currentState, aliceBalance, bobBalance })),
      freeBalanceAppIndexes,
      this.monotonicallyIncreasingSeqNo + 1
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

    // Must do this inline because `delete` returns a boolean unlike `set`
    appInstances.delete(appToBeUninstalled.id);

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      appInstances.set(
        fb.id,
        fb.setState({ ...currentState, aliceBalance, bobBalance })
      ),
      freeBalanceAppIndexes,
      this.monotonicallyIncreasingSeqNo
    );
  }
}
