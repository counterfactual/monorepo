import { InstructionExecutor } from "@counterfactual/machine";
import { Zero } from "ethers/constants";

import { Store } from "../../../store";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingXpub: string,
  respondingXpub: string,
  intermediaryXpub: string,
  appInstanceId: string
) {
  // TODO: this should actually call resolve on the AppInstance and execute
  // the appropriate payout to the right parties

  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const currentChannels = new Map(Object.entries(await store.getAllChannels()));

  const stateChannelsMap = await instructionExecutor.runUninstallVirtualAppProtocol(
    currentChannels,
    {
      initiatingXpub,
      respondingXpub,
      intermediaryXpub,
      targetAppIdentityHash: appInstance.identityHash,
      // FIXME: Compute values here
      initiatingBalanceIncrement: Zero,
      respondingBalanceIncrement: Zero
    }
  );

  stateChannelsMap.forEach(
    async stateChannel => await store.saveStateChannel(stateChannel)
  );
}
