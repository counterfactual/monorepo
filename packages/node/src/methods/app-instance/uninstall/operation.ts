import {
  DirectChannelProtocolContext,
  InstructionExecutor
} from "../../../machine";
import { Store } from "../../../store";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingXpub: string,
  respondingXpub: string,
  appInstanceId: string
): Promise<void> {
  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const {
    stateChannel: newChannel
  } = (await instructionExecutor.runUninstallProtocol(stateChannel, {
    initiatingXpub,
    respondingXpub,
    multisigAddress: stateChannel.multisigAddress,
    appIdentityHash: appInstanceId
  })) as DirectChannelProtocolContext;

  await store.saveStateChannel(newChannel);
}
