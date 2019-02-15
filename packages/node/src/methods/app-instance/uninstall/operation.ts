import { InstructionExecutor } from "@counterfactual/machine";
import { Zero } from "ethers/constants";

import { Store } from "../../../store";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingXpub: string,
  respondingXpub: string,
  appInstanceId: string
) {
  // TODO: this should actually call resolve on the AppInstance and execute
  // the appropriate payout to the right parties

  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const currentChannels = new Map(Object.entries(await store.getAllChannels()));

  const stateChannelsMap = await instructionExecutor.runUninstallProtocol(
    currentChannels,
    {
      initiatingXpub,
      respondingXpub,
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
}
