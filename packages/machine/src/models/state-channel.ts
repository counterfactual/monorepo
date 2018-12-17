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
  freeBalanceInitialStateTimeout: 100
};

const enum Errors {
  APPS_NOT_EMPTY = "Expected the apps list to be empty but size was nonzero",
  APP_DOES_NOT_EXIST = "Attempted to edit an app that does not exist",
  FREE_BALANCE_MISSING = "Cannot find ETH Free Balance App in StateChannel",
  FREE_BALANCE_IDX_CORRUPT = "Index used to find ETH Free Balance is broken",
  INSUFFICIENT_FUNDS = "Attempted to install an app without sufficient funds"
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
    public readonly apps: Readonly<Map<string, AppInstance>>,
    private readonly freeBalanceAppIndexes: Readonly<Map<AssetType, string>>,
    private readonly monotonicallyIncreasingSeqNo: number = 0
  ) {}

  public get sequenceNumber() {
    return this.monotonicallyIncreasingSeqNo;
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

    const apps = new Map<string, AppInstance>(this.apps.entries());
    const xs = new Map<AssetType, string>(this.freeBalanceAppIndexes.entries());

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      apps.set(fb.id, fb),
      xs.set(AssetType.ETH, fb.id),
      this.monotonicallyIncreasingSeqNo + 1
    );
  }

  public setState(appid: string, state: object) {
    const app = this.apps.get(appid);

    if (app === undefined) throw Error(Errors.APP_DOES_NOT_EXIST);

    const apps = new Map<string, AppInstance>(this.apps.entries());
    const xs = new Map<AssetType, string>(this.freeBalanceAppIndexes.entries());

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      apps.set(appid, app.setState(state)),
      xs,
      this.monotonicallyIncreasingSeqNo
    );
  }

  public installApp(
    app: AppInstance,
    aliceBalanceDecrement: BigNumber,
    bobBalanceDecrement: BigNumber
  ) {
    const fb = this.getFreeBalanceFor(AssetType.ETH);
    const currentState = fb.state as ETHBucketAppState;

    const aliceBalance = currentState.aliceBalance.sub(aliceBalanceDecrement);
    const bobBalance = currentState.bobBalance.sub(bobBalanceDecrement);

    if (aliceBalance.lt(Zero)) throw Error(INSUFFICIENT_FUNDS);
    if (bobBalance.lt(Zero)) throw Error(INSUFFICIENT_FUNDS);

    const apps = new Map<string, AppInstance>(this.apps.entries());
    const xs = new Map<AssetType, string>(this.freeBalanceAppIndexes.entries());

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      apps
        .set(app.id, app)
        .set(fb.id, fb.setState({ ...currentState, aliceBalance, bobBalance })),
      xs,
      this.monotonicallyIncreasingSeqNo + 1
    );
  }

  public uninstallApp(
    appInstanceId: string,
    aliceBalanceIncrement: BigNumber,
    bobBalanceIncrement: BigNumber
  ) {
    const fb = this.getFreeBalanceFor(AssetType.ETH);

    const appToBeUninstalled = this.apps.get(appInstanceId);

    if (!appToBeUninstalled) throw Error(Errors.APP_DOES_NOT_EXIST);

    const currentState = fb.state as ETHBucketAppState;

    const aliceBalance = currentState.aliceBalance.sub(aliceBalanceIncrement);
    const bobBalance = currentState.bobBalance.sub(bobBalanceIncrement);

    const apps = new Map<string, AppInstance>(this.apps.entries());
    const xs = new Map<AssetType, string>(this.freeBalanceAppIndexes.entries());

    apps.delete(appToBeUninstalled.id);

    return new StateChannel(
      this.multisigAddress,
      this.multisigOwners,
      apps.set(
        fb.id,
        fb.setState({ ...currentState, aliceBalance, bobBalance })
      ),
      xs,
      this.monotonicallyIncreasingSeqNo
    );
  }
}
