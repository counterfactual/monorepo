import { Provider } from "ethers/providers";

import { Protocol, ProtocolRunner } from "../../../engine";
import { Store } from "../../../store";

export async function uninstallVirtualAppInstanceFromChannel(
  store: Store,
  protocolRunner: ProtocolRunner,
  provider: Provider,
  initiatorXpub: string,
  responderXpub: string,
  intermediaryXpub: string,
  appInstanceId: string
): Promise<void> {
  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  await protocolRunner.initiateProtocol(Protocol.UninstallVirtualApp, {
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
