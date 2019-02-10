import { InstructionExecutor, StateChannel } from "@counterfactual/machine";
import { Zero } from "ethers/constants";

import { Store } from "../../../store";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingAddress: string,
  respondingAddress: string,
  appInstanceId: string
): Promise<StateChannel> {
  // TODO: this should actually call resolve on the AppInstance and execute
  // the appropriate payout to the right parties

  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const stateChannelsMap = await instructionExecutor.runUninstallProtocol(
    new Map(Object.entries(await store.getAllChannels())),
    {
      initiatingAddress,
      respondingAddress,
      multisigAddress: stateChannel.multisigAddress,
      appIdentityHash: appInstance.identityHash,
      // FIXME: Compute values here
      aliceBalanceIncrement: Zero,
      bobBalanceIncrement: Zero
    }
  );

  await store.saveStateChannel(
    stateChannelsMap.get(stateChannel.multisigAddress)!
  );

  return stateChannelsMap.get(stateChannel.multisigAddress)!;
}
