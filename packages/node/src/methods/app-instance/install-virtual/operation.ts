import {
  InstructionExecutor,
  xkeysToSortedKthAddresses
} from "@counterfactual/machine";
import { AppInstanceInfo, Node } from "@counterfactual/types";

import { Store } from "../../../store";
import { ERRORS } from "../../errors";

export async function installVirtual(
  store: Store,
  instructionExecutor: InstructionExecutor,
  params: Node.InstallParams
): Promise<AppInstanceInfo> {
  const { appInstanceId } = params;

  if (!appInstanceId || !appInstanceId.trim()) {
    return Promise.reject(ERRORS.NO_APP_INSTANCE_ID_TO_INSTALL);
  }

  const appInstanceInfo = await store.getProposedAppInstanceInfo(appInstanceId);

  const updatedStateChannelsMap = await instructionExecutor.runInstallVirtualAppProtocol(
    new Map(Object.entries(await store.getAllChannels())),
    {
      initiatingAddress: appInstanceInfo.proposedToIdentifier,
      respondingAddress: appInstanceInfo.proposedByIdentifier,
      intermediaryAddress: appInstanceInfo.intermediaries![0],
      signingKeys: xkeysToSortedKthAddresses(
        [
          appInstanceInfo.proposedByIdentifier,
          appInstanceInfo.proposedToIdentifier
        ],
        1337
      ),
      defaultTimeout: appInstanceInfo.timeout.toNumber(),
      appInterface: {
        addr: appInstanceInfo.appId,
        ...appInstanceInfo.abiEncodings
      },
      initialState: appInstanceInfo.initialState,
      initiatingBalanceDecrement: appInstanceInfo.myDeposit,
      respondingBalanceDecrement: appInstanceInfo.peerDeposit
    }
  );

  updatedStateChannelsMap.forEach(
    async stateChannel => await store.saveStateChannel(stateChannel)
  );

  await store.saveRealizedProposedAppInstance(appInstanceInfo);

  return appInstanceInfo;
}
