import { Node } from "@counterfactual/types";

import {
  InstructionExecutor,
  VirtualChannelProtocolContext
} from "../../../machine";
import { ProposedAppInstanceInfo } from "../../../models";
import { Store } from "../../../store";
import { NO_APP_INSTANCE_ID_TO_INSTALL } from "../../errors";

export async function installVirtual(
  store: Store,
  instructionExecutor: InstructionExecutor,
  params: Node.InstallParams
): Promise<ProposedAppInstanceInfo> {
  const { appInstanceId } = params;

  if (!appInstanceId || !appInstanceId.trim()) {
    return Promise.reject(NO_APP_INSTANCE_ID_TO_INSTALL);
  }

  const proposedAppInstanceInfo = await store.getProposedAppInstanceInfo(
    appInstanceId
  );

  const channelWithIntermediary = await store.getStateChannelFromOwners([
    proposedAppInstanceInfo.proposedToIdentifier,
    proposedAppInstanceInfo.intermediaries![0]
  ]);

  const channelWithCounterparty = await store.getStateChannelFromOwners([
    proposedAppInstanceInfo.proposedByIdentifier,
    proposedAppInstanceInfo.proposedToIdentifier
  ]);

  const {
    stateChannelWithIntermediary,
    stateChannelWithCounterparty
  } = (await instructionExecutor.runInstallVirtualAppProtocol(
    channelWithIntermediary,
    channelWithCounterparty,
    {
      initiatingXpub: proposedAppInstanceInfo.proposedToIdentifier,
      respondingXpub: proposedAppInstanceInfo.proposedByIdentifier,
      intermediaryXpub: proposedAppInstanceInfo.intermediaries![0],
      defaultTimeout: proposedAppInstanceInfo.timeout.toNumber(),
      appInterface: {
        addr: proposedAppInstanceInfo.appDefinition,
        ...proposedAppInstanceInfo.abiEncodings
      },
      initialState: proposedAppInstanceInfo.initialState,
      initiatingBalanceDecrement: proposedAppInstanceInfo.myDeposit,
      respondingBalanceDecrement: proposedAppInstanceInfo.peerDeposit
    }
  )) as VirtualChannelProtocolContext;

  await store.saveStateChannel(stateChannelWithIntermediary);
  await store.saveStateChannel(stateChannelWithCounterparty);

  await store.saveRealizedProposedAppInstance(proposedAppInstanceInfo);

  return proposedAppInstanceInfo;
}
