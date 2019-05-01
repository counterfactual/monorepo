import CounterfactualApp from "@counterfactual/contracts/build/CounterfactualApp.json";
import { AssetType } from "@counterfactual/types";
import { Contract } from "ethers";
import { Zero } from "ethers/constants";
import { BaseProvider } from "ethers/providers";
import { BigNumber, bigNumberify } from "ethers/utils";

import { StateChannel } from "../../models";

type TransferTransaction = {
  assetType: AssetType;
  token: string;
  to: string[];
  value: BigNumber[];
  data: string[];
};

export async function computeFreeBalanceIncrements(
  stateChannel: StateChannel,
  appInstanceId: string,
  provider: BaseProvider
): Promise<{ [x: string]: BigNumber }> {
  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const appContract = new Contract(
    appInstance.appInterface.addr,
    CounterfactualApp.abi,
    provider
  );

  let attempts = 1;
  let resolution: TransferTransaction = await appContract.functions.resolve(
    appInstance.encodedLatestState,
    appInstance.terms
  );

  // FIXME: This retry logic should apply to all view functions _and_ works for
  //        arbitrary asset types. Presently it only works for ETH resolutions.
  //        This was added to get the Playground demo launched sooner.
  const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
  while (
    bigNumberify(appInstance.terms.limit).gt(Zero) &&
    resolution.value.every(v => v.eq(Zero)) &&
    attempts < 10
  ) {
    console.log(`Empty resolution. Querying chain again. Attempt #${attempts}`);

    resolution = await appContract.functions.resolve(
      appInstance.encodedLatestState,
      appInstance.terms
    );

    attempts += 1;

    await wait(1000 * attempts);
  }
  // END FIXME

  if (resolution.assetType !== AssetType.ETH) {
    return Promise.reject("Node only supports ETH resolutions at the moment.");
  }

  return resolution.to.reduce(
    (accumulator, currentValue, idx) => ({
      ...accumulator,
      [currentValue]: resolution.value[idx]
    }),
    {}
  );
}

export function getAliceBobMap(
  channel: StateChannel
): { alice: string; bob: string } {
  return {
    alice: channel.multisigOwners[0],
    bob: channel.multisigOwners[1]
  };
}
