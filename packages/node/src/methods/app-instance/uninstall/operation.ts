import { InstructionExecutor, StateChannel } from "@counterfactual/machine";
import { AssetType } from "@counterfactual/types";
import { Contract } from "ethers";
import { JsonRpcProvider } from "ethers/providers";
import { BigNumber } from "ethers/utils";

import { Store } from "../../../store";
import { isNotDefinedOrEmpty } from "../../../utils";
import { ERRORS } from "../../errors";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingXpub: string,
  respondingXpub: string,
  appInstanceId: string,
  aliceBalanceIncrement: BigNumber,
  bobBalanceIncrement: BigNumber
): Promise<void> {
  // TODO: this should actually call resolve on the AppInstance and execute
  // the appropriate payout to the right parties

  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const currentChannels = new Map(Object.entries(await store.getAllChannels()));

  const stateChannelsMap = await instructionExecutor.runUninstallProtocol(
    currentChannels,
    {
      aliceBalanceIncrement,
      bobBalanceIncrement,
      initiatingXpub,
      respondingXpub,
      multisigAddress: stateChannel.multisigAddress,
      appIdentityHash: appInstance.identityHash
    }
  );

  await store.saveStateChannel(
    stateChannelsMap.get(stateChannel.multisigAddress)!
  );
}

export async function computeFreeBalanceIncrements(
  stateChannel: StateChannel,
  appInstanceId: string,
  provider: JsonRpcProvider
): Promise<{ [x: string]: BigNumber }> {
  type TransferTransaction = {
    assetType: AssetType;
    token: string;
    to: string[];
    value: BigNumber[];
    data: string[];
  };

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  if (isNotDefinedOrEmpty(appInstance.appInterface.addr)) {
    return Promise.reject(ERRORS.NO_APP_CONTRACT_ADDR);
  }

  const appContract = new Contract(
    appInstance.appInterface.addr,
    // TODO: Import CounterfactualApp.json directly and place it here.
    //       Keep in mind that requires bundling the json in the rollup dist.
    [
      `function resolve(bytes, tuple(uint8 assetType, uint256 limit, address token))
      pure
      returns (
        tuple(
          uint8 assetType,
          address token,
          address[] to,
          uint256[] value,
          bytes[] data
        )
      )`
    ],
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
