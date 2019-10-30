import { Protocol, ProtocolRunner } from "../../../engine";
import { Store } from "../../../store";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  protocolRunner: ProtocolRunner,
  initiatorXpub: string,
  responderXpub: string,
  appInstanceId: string
): Promise<void> {
  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  await protocolRunner.initiateProtocol(Protocol.Uninstall, {
    initiatorXpub,
    responderXpub,
    multisigAddress: stateChannel.multisigAddress,
    appIdentityHash: appInstance.identityHash
  });
}
