import { InstructionExecutor, StateChannel } from "../../../machine";
import { Store } from "../../../store";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingXpub: string,
  respondingXpub: string,
  appInstanceId: string
): Promise<void> {
  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const stateChannelsMap = await instructionExecutor.runUninstallProtocol(
    new Map(Object.entries(await store.getAllChannels())),
    {
      initiatingXpub,
      respondingXpub,
      multisigAddress: stateChannel.multisigAddress,
      appIdentityHash: appInstance.identityHash
    }
  );

  await store.saveStateChannel(stateChannelsMap.get(
    stateChannel.multisigAddress
  ) as StateChannel);
}
