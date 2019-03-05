import CounterfactualApp from "@counterfactual/contracts/build/CounterfactualApp.json";
import { AssetType } from "@counterfactual/types";
import { Contract } from "ethers";
import { BaseProvider } from "ethers/providers";
import { BigNumber } from "ethers/utils";

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

  const resolution: TransferTransaction = await appContract.functions.resolve(
    appInstance.encodedLatestState,
    appInstance.terms
  );

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
