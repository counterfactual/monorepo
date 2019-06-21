import { Node } from "@counterfactual/types";

import {
  DirectChannelProtocolContext,
  InstructionExecutor
} from "../../../machine";
import { ProposedAppInstanceInfo } from "../../../models";
import { Store } from "../../../store";
import { NO_APP_INSTANCE_ID_TO_INSTALL } from "../../errors";

export async function install(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingAddress: string,
  respondingAddress: string,
  params: Node.InstallParams
): Promise<ProposedAppInstanceInfo> {
  const { appInstanceId } = params;

  if (!appInstanceId || !appInstanceId.trim()) {
    return Promise.reject(NO_APP_INSTANCE_ID_TO_INSTALL);
  }

  const appInstanceInfo = await store.getProposedAppInstanceInfo(appInstanceId);

  const existingChannel = await store.getChannelFromAppInstanceID(
    appInstanceId
  );

  const { stateChannel } = (await instructionExecutor.runInstallProtocol(
    existingChannel,
    {
      initiatingXpub: appInstanceInfo.proposedToIdentifier,
      respondingXpub: appInstanceInfo.proposedByIdentifier,
      initiatingBalanceDecrement: appInstanceInfo.myDeposit,
      respondingBalanceDecrement: appInstanceInfo.peerDeposit,
      multisigAddress: existingChannel.multisigAddress,
      signingKeys: existingChannel.getNextSigningKeys(),
      initialState: appInstanceInfo.initialState,
      appInterface: {
        ...appInstanceInfo.abiEncodings,
        addr: appInstanceInfo.appDefinition
      },
      defaultTimeout: appInstanceInfo.timeout.toNumber(),
      outcomeType: appInstanceInfo.outcomeType
    }
  )) as DirectChannelProtocolContext;

  await store.saveStateChannel(stateChannel);

  await store.saveRealizedProposedAppInstance(appInstanceInfo);

  return appInstanceInfo;
}
