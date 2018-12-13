import {
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";

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
    public freeBalanceAppIndexes: Map<AssetType, string>
  ) {}

  public setupChannel(network: NetworkContext) {
    if (this.apps.size !== 0) {
      throw Error("Called setupChannel on a channel with nonzero apps");
    }

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

    if (app === undefined) {
      throw Error("Called setState for an app which does not exist");
    }

    app.state = state;

    return this;
  }

  // FIXME: Include sub-deposit information
  public installApp(app: AppInstance) {
    const idx = this.freeBalanceAppIndexes.get(AssetType.ETH);
    if (idx === undefined) {
      throw Error(
        "Attempted to install an app on a state channel with no ETH free balance"
      );
    }

    const fb = this.apps.get(idx);
    if (fb === undefined) {
      throw Error(
        "Malformed StateChannel does not have an ETH Free Balance in list of apps"
      );
    }

    // Install the App
    this.apps.set(app.id, app);

    // Update ETH FreeBalance
    (fb.latestState as ETHBucketAppState).aliceBalance.sub(5);

    return this;
  }

  // FIXME: Compute resolution somehow
  public uninstallApp(appid: string) {
    if (this.apps.size === 0) {
      throw Error("Called uninstallApp on a channel with no apps");
    }

    const idx = this.freeBalanceAppIndexes.get(AssetType.ETH);

    if (idx === undefined) {
      throw Error(
        "Attempted to uninstall an app on a state channel with no ETH free balance"
      );
    }

    const fb = this.apps.get(idx);

    if (fb === undefined) {
      throw Error(
        "Malformed StateChannel does not have an ETH Free Balance in list of apps"
      );
    }

    const appToBeUninstalled = this.apps.get(appid);

    if (appToBeUninstalled === undefined) {
      throw Error("Attempted to uninstall an app which does not exist");
    }

    // Update the ETH FreeBalance by resolution amount
    // FIXME: We ought to use proposedResolution. Need to define that type.
    (fb.latestState as ETHBucketAppState).aliceBalance.add(5);
    fb.latestNonce += 1;

    // Delete the old app.
    this.apps.delete(appid);

    return this;
  }
}
