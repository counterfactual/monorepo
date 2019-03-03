import { InstructionExecutor } from "@counterfactual/machine";
import { BigNumber } from "ethers/utils";

import { Store } from "../../../store";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingXpub: string,
  respondingXpub: string,
  intermediaryXpub: string,
  appInstanceId: string,
  initiatingBalanceIncrement: BigNumber,
  respondingBalanceIncrement: BigNumber
): Promise<void> {
  // TODO: this should actually call resolve on the AppInstance and execute
  // the appropriate payout to the right parties

  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const currentChannels = new Map(Object.entries(await store.getAllChannels()));

  const stateChannelsMap = await instructionExecutor.runUninstallVirtualAppProtocol(
    currentChannels,
    {
      initiatingBalanceIncrement,
      respondingBalanceIncrement,
      initiatingXpub,
      respondingXpub,
      intermediaryXpub,
      targetAppIdentityHash: appInstance.identityHash
    }
  );

  stateChannelsMap.forEach(
    async stateChannel => await store.saveStateChannel(stateChannel)
  );
}
