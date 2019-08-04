import { InstructionExecutor, Protocol } from "../../../machine";
import { StateChannel } from "../../../models";
import { Store } from "../../../store";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatorXpub: string,
  responderXpub: string,
  appInstanceId: string
): Promise<void> {
  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const stateChannelsMap = await instructionExecutor.initiateProtocol(
    Protocol.Uninstall,
    await store.getStateChannelsMap(),
    {
      initiatorXpub,
      responderXpub,
      multisigAddress: stateChannel.multisigAddress,
      appIdentityHash: appInstance.identityHash
    }
  );

  await store.saveStateChannel(stateChannelsMap.get(
    stateChannel.multisigAddress
  ) as StateChannel);
}
