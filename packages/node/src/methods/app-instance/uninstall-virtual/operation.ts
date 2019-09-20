import { BaseProvider } from "ethers/providers";

import { Engine, Protocol } from "../../../machine";
import { Store } from "../../../store";

export async function uninstallVirtualAppInstanceFromChannel(
  store: Store,
  engine: Engine,
  provider: BaseProvider,
  initiatorXpub: string,
  responderXpub: string,
  intermediaryXpub: string,
  appInstanceId: string
): Promise<void> {
  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const currentChannels = await store.getStateChannelsMap();

  await engine.initiateProtocol(Protocol.UninstallVirtualApp, currentChannels, {
    initiatorXpub,
    responderXpub,
    intermediaryXpub,
    targetOutcome: await appInstance.computeOutcome(
      appInstance.state,
      provider
    ),
    targetAppIdentityHash: appInstance.identityHash
  });
}
