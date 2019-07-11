import {
  getNextNodeAddress,
  getOrCreateStateChannelThatWrapsVirtualAppInstance,
  isNodeIntermediary
} from "../methods/app-instance/propose-install-virtual/operation";
import { NO_APP_INSTANCE_ID_TO_INSTALL } from "../methods/errors";
import { ProposedAppInstanceInfo } from "../models";
import { RequestHandler } from "../request-handler";
import {
  InstallMessage,
  InstallVirtualMessage,
  NODE_EVENTS,
  ProposeMessage,
  ProposeVirtualMessage,
  RejectProposalMessage
} from "../types";
import { getStateChannelBasedOnTwoXpubs } from "../utils";

/**
 * This function responds to a installation proposal approval from a peer Node
 * by counter installing the AppInstance this Node proposed earlier.
 *
 * NOTE: The following code is mostly just a copy of the code from the
 *       methods/intall/operations.ts::install method with the exception
 *       of the lack of a initiateProtocol<Protocol.Install> call. This is because this is
 *       the counterparty end of the install protocol which runs _after_
 *       the _runProtocolWithMessage_ call finishes and saves the result.
 */
export async function handleReceivedInstallMessage(
  requestHandler: RequestHandler,
  receivedInstallMessage: InstallMessage
) {
  const { store } = requestHandler;
  const {
    data: {
      params: { appInstanceId }
    }
  } = receivedInstallMessage;

  if (!appInstanceId || !appInstanceId.trim()) {
    throw new Error(NO_APP_INSTANCE_ID_TO_INSTALL);
  }

  return await store.saveRealizedProposedAppInstance(
    await store.getProposedAppInstanceInfo(appInstanceId)
  );
}

export async function handleReceivedInstallVirtualMessage(
  requestHandler: RequestHandler,
  receivedInstallVirtualMessage: InstallVirtualMessage
) {
  await handleReceivedInstallMessage(
    requestHandler,
    receivedInstallVirtualMessage
  );
}

export async function handleReceivedProposalMessage(
  requestHandler: RequestHandler,
  receivedProposeMessage: ProposeMessage
) {
  const { publicIdentifier, store } = requestHandler;

  const {
    data: { params },
    from: proposedByIdentifier
  } = receivedProposeMessage;

  const stateChannel = await getStateChannelBasedOnTwoXpubs(
    publicIdentifier,
    proposedByIdentifier,
    store
  );

  await store.addAppInstanceProposal(
    stateChannel,
    new ProposedAppInstanceInfo(
      {
        ...params,
        proposedByIdentifier,
        myDeposit: params.peerDeposit,
        peerDeposit: params.myDeposit
      },
      stateChannel
    )
  );
}

export async function handleRejectProposalMessage(
  requestHandler: RequestHandler,
  receivedRejectProposalMessage: RejectProposalMessage
) {
  const { store } = requestHandler;
  const {
    data: { appInstanceId }
  } = receivedRejectProposalMessage;
  await store.removeAppInstanceProposal(appInstanceId);
}

export async function handleReceivedProposeVirtualMessage(
  requestHandler: RequestHandler,
  receivedProposeMessage: ProposeVirtualMessage
) {
  const { publicIdentifier, store, messagingService } = requestHandler;

  const {
    data: { params, proposedByIdentifier }
  } = receivedProposeMessage;

  const {
    intermediaries,
    proposedToIdentifier,
    peerDeposit,
    myDeposit
  } = params;

  const stateChannel = await getOrCreateStateChannelThatWrapsVirtualAppInstance(
    proposedByIdentifier,
    publicIdentifier,
    intermediaries,
    store
  );

  await store.addVirtualAppInstanceProposal(
    new ProposedAppInstanceInfo(
      {
        ...params,
        proposedByIdentifier,
        myDeposit: peerDeposit,
        peerDeposit: myDeposit
      },
      stateChannel
    )
  );

  if (isNodeIntermediary(publicIdentifier, intermediaries)) {
    // TODO: Remove this and add a handler in protocolMessageEventController
    await messagingService.send(
      getNextNodeAddress(
        publicIdentifier,
        intermediaries,
        proposedToIdentifier
      ),
      {
        from: publicIdentifier,
        type: NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
        data: receivedProposeMessage.data
      } as ProposeVirtualMessage
    );
  }
}
