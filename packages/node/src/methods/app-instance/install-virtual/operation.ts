import { AppInstanceProposal, Node } from "@counterfactual/types";

import { InstructionExecutor, Protocol } from "../../../machine";
import { StateChannel } from "../../../models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../models/free-balance";
import { Store } from "../../../store";
import {
  NO_APP_INSTANCE_ID_TO_INSTALL,
  VIRTUAL_APP_INSTALLATION_FAIL
} from "../../errors";

export async function installVirtual(
  store: Store,
  instructionExecutor: InstructionExecutor,
  params: Node.InstallParams
): Promise<AppInstanceProposal> {
  const { appInstanceId } = params;

  if (!appInstanceId || !appInstanceId.trim()) {
    return Promise.reject(NO_APP_INSTANCE_ID_TO_INSTALL);
  }

  const proposal = await store.getAppInstanceProposal(appInstanceId);

  let updatedStateChannelsMap: Map<string, StateChannel>;

  try {
    updatedStateChannelsMap = await instructionExecutor.initiateProtocol(
      Protocol.InstallVirtualApp,
      new Map(Object.entries(await store.getAllChannels())),
      {
        initiatingXpub: proposal.proposedToIdentifier,
        respondingXpub: proposal.proposedByIdentifier,
        intermediaryXpub: proposal.intermediaries![0],
        defaultTimeout: proposal.timeout.toNumber(),
        appInterface: {
          addr: proposal.appDefinition,
          ...proposal.abiEncodings
        },
        initialState: proposal.initialState,
        initiatingBalanceDecrement: proposal.myDeposit,
        respondingBalanceDecrement: proposal.peerDeposit,
        tokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS
      }
    );
  } catch (e) {
    throw new Error(
      // TODO: We should generalize this error handling style everywhere
      `Node Error: ${VIRTUAL_APP_INSTALLATION_FAIL}\nStack Trace: ${e.stack}`
    );
  }

  updatedStateChannelsMap.forEach(
    async stateChannel => await store.saveStateChannel(stateChannel)
  );

  await store.saveRealizedProposedAppInstance(proposal);

  return proposal;
}
