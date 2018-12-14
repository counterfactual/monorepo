import {
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";
import { BigNumber } from "ethers/utils";

import {
  freeBalanceTerms,
  getFreeBalanceAppInterface
} from "../ethereum/utils/free-balance";

import { AppInstance } from "./app-instance";

// TODO: Hmmm this code should probably be somewhere else?
const HARD_CODED_ASSUMPTIONS = {
  freeBalanceDefaultTimeout: 100,
  freeBalanceInitialStateTimeout: 100
};

const enum Errors {
  APPS_NOT_EMPTY = "Expected the apps list to be empty but size was nonzero",
  APP_DOES_NOT_EXIST = "Attempted to edit an app that does not exist",
  FREE_BALANCE_MISSING = "Cannot find ETH Free Balance App in StateChannel",
  FREE_BALANCE_IDX_CORRUPT = "Index used to find ETH Free Balance is broken"
}

function createETHFreeBalance(
  multisigAddress: string,
  multisigOwners: string[],
  ethBucketAddress: string
) {
  return new AppInstance(
    multisigAddress,
    multisigOwners,
    HARD_CODED_ASSUMPTIONS.freeBalanceDefaultTimeout,
    getFreeBalanceAppInterface(ethBucketAddress),
    freeBalanceTerms,
    false,
    0,
    {
      alice: multisigOwners[0],
      bob: multisigOwners[1],
      aliceBalance: 0,
      bobBalance: 0
    },
    0,
    HARD_CODED_ASSUMPTIONS.freeBalanceInitialStateTimeout
  );
}

// FIXME: Need to encode the notion of dependencies in here somewhere
export class StateChannel {
  constructor(
    public readonly multisigAddress: string,
    public readonly multisigOwners: string[],
    public apps: Map<string, AppInstance>,
    public freeBalanceAppIndexes: Map<AssetType, string>,
    public sequenceNumber: number = 0
  ) {}

  public getFreeBalanceFor(assetType: AssetType) {
    const idx = this.freeBalanceAppIndexes.get(assetType);

    if (!idx) throw Error(Errors.FREE_BALANCE_MISSING);

    const fb = this.apps.get(idx);

    if (!fb) throw Error(Errors.FREE_BALANCE_IDX_CORRUPT);

    return fb;
  }

  public setupChannel(network: NetworkContext) {
    if (this.apps.size !== 0) throw Error(Errors.APPS_NOT_EMPTY);

    const fb = createETHFreeBalance(
      this.multisigAddress,
      this.multisigOwners,
      network.ETHBucket
    );

    this.apps.set(fb.id, fb);
    this.freeBalanceAppIndexes.set(AssetType.ETH, fb.id);

    return this;
  }

  public setState(appid: string, state: object) {
    const app = this.apps.get(appid);

    if (app === undefined) throw Error(Errors.APP_DOES_NOT_EXIST);

    app.state = state;

    return this;
  }

  // FIXME: Include sub-deposit information
  public installApp(
    app: AppInstance,
    aliceBalanceDecrement: BigNumber,
    bobBalanceDecrement: BigNumber
  ) {
    const fb = this.getFreeBalanceFor(AssetType.ETH);

    // Install the App
    this.apps.set(app.id, app);

    // Update ETH FreeBalance
    const latestState = fb.latestState as ETHBucketAppState;
    latestState.aliceBalance.sub(aliceBalanceDecrement);
    latestState.bobBalance.sub(bobBalanceDecrement);

    return this;
  }

  public uninstallApp(
    appInstanceId: string,
    aliceBalanceIncrement: BigNumber,
    bobBalanceIncrement: BigNumber
  ) {
    const fb = this.getFreeBalanceFor(AssetType.ETH);

    const appToBeUninstalled = this.apps.get(appInstanceId);

    if (!appToBeUninstalled) throw Error(Errors.APP_DOES_NOT_EXIST);

    // TODO: Hard-coded for ETH at the moment
    const latestState = fb.latestState as ETHBucketAppState;
    latestState.aliceBalance.add(aliceBalanceIncrement);
    latestState.bobBalance.add(bobBalanceIncrement);

    fb.latestNonce += 1;

    // Delete the old app.
    this.apps.delete(appInstanceId);

    return this;
  }
}
