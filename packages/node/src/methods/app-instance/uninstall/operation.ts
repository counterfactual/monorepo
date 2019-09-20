import { Protocol, Engine } from "../../../machine";
import { Store } from "../../../store";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  engine: Engine,
  initiatorXpub: string,
  responderXpub: string,
  appInstanceId: string
): Promise<void> {
  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  await engine.initiateProtocol(
    Protocol.Uninstall,
    await store.getStateChannelsMap(),
    {
      initiatorXpub,
      responderXpub,
      multisigAddress: stateChannel.multisigAddress,
      appIdentityHash: appInstance.identityHash
    }
  );
}
