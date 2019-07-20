import { BaseProvider } from "ethers/providers";

import { InstructionExecutor, Protocol } from "../../../machine";
import { Store } from "../../../store";

export async function uninstallVirtualAppInstanceFromChannel(
  store: Store,
  instructionExecutor: InstructionExecutor,
  provider: BaseProvider,
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
      targetOutcome: await appInstance.computeOutcome(
        appInstance.state,
        provider
      ),
      targetAppIdentityHash: appInstance.identityHash
    }
  );

  stateChannelsMap.forEach(
    async stateChannel => await store.saveStateChannel(stateChannel)
  );
}
