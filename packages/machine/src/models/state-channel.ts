import { AssetType, NetworkContext } from "@counterfactual/types";
import { Zero } from "ethers/constants";
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
    [multisigOwners[0], multisigOwners[1], Zero, Zero],
    0,
    HARD_CODED_ASSUMPTIONS.freeBalanceInitialStateTimeout
  );
}

export class StateChannel {
  constructor(
    public readonly multisigAddress: string,
    public readonly multisigOwners: string[],
    public apps: Map<string, AppInstance>,
    private freeBalanceAppIndexes: Map<AssetType, string>,
    private sequenceNo: number = 0
  ) {}

  public get sequenceNumber() {
    return this.sequenceNo;
  }

  public bumpSequenceNumber() {
    this.sequenceNo += 1;
  }

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

    this.bumpSequenceNumber();

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
    fb.latestState[2] = fb.latestState[2].sub(aliceBalanceDecrement);
    fb.latestState[3] = fb.latestState[3].sub(bobBalanceDecrement);

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
    fb.latestState[2] = fb.latestState[2].add(aliceBalanceIncrement);
    fb.latestState[3] = fb.latestState[3].add(bobBalanceIncrement);

    fb.latestNonce += 1;

    // Delete the old app.
    this.apps.delete(appInstanceId);

    return this;
  }
}
