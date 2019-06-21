import {
  InstructionExecutor,
  VirtualChannelProtocolContext
} from "../../../machine";
import { Store } from "../../../store";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingXpub: string,
  respondingXpub: string,
  intermediaryXpub: string,
  appInstanceId: string
): Promise<void> {
  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstance = stateChannel.getAppInstance(appInstanceId);

  const channelWithIntermediary = await store.getStateChannelFromOwners([
    initiatingXpub,
    intermediaryXpub
  ]);

  const channelWithCounterparty = await store.getStateChannelFromOwners([
    initiatingXpub,
    respondingXpub
  ]);

  const {
    stateChannelWithIntermediary,
    stateChannelWithCounterparty
  } = (await instructionExecutor.runUninstallVirtualAppProtocol(
    channelWithIntermediary,
    channelWithCounterparty,
    {
      initiatingXpub,
      respondingXpub,
      intermediaryXpub,
      targetAppState: appInstance.state,
      targetAppIdentityHash: appInstance.identityHash
    }
  )) as VirtualChannelProtocolContext;

  await store.saveStateChannel(stateChannelWithIntermediary);
  await store.saveStateChannel(stateChannelWithCounterparty);
}
