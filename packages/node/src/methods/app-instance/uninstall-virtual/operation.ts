import { InstructionExecutor, Protocol } from "../../../machine";
import { Store } from "../../../store";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatorXpub: string,
  responderXpub: string,
  intermediaryXpub: string,
  appInstanceId: string
): Promise<void> {
  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const currentChannels = new Map(Object.entries(await store.getAllChannels()));

  const stateChannelsMap = await instructionExecutor.initiateProtocol(
    Protocol.UninstallVirtualApp,
    currentChannels,
    {
      initiatorXpub,
      responderXpub,
      intermediaryXpub,
      targetAppState: appInstance.state,
      targetAppIdentityHash: appInstance.identityHash
    }
  );

  stateChannelsMap.forEach(
    async stateChannel => await store.saveStateChannel(stateChannel)
  );
}
