import {
  getNextNodeAddress,
  getOrCreateStateChannelBetweenVirtualAppParticipants
} from "../methods/app-instance/propose-install-virtual/operation";
import { AppInstanceProposal } from "../models";
import { RequestHandler } from "../request-handler";
import {
  NODE_EVENTS,
  ProposeMessage,
  ProposeVirtualMessage,
  RejectProposalMessage
} from "../types";
import { getCreate2MultisigAddress } from "../utils";

export async function handleReceivedProposalMessage(
  requestHandler: RequestHandler,
  receivedProposeMessage: ProposeMessage
) {
  const { publicIdentifier, store, networkContext } = requestHandler;

  const {
    data: { params },
    from: proposedByIdentifier
  } = receivedProposeMessage;

  const multisigAddress = getCreate2MultisigAddress(
    [publicIdentifier, proposedByIdentifier],
    networkContext.ProxyFactory,
    networkContext.MinimumViableMultisig
  );

  const stateChannel = await store.getStateChannel(multisigAddress);

  await store.addAppInstanceProposal(
    stateChannel,
    new AppInstanceProposal(
      {
        ...params,
        proposedByIdentifier,
        initiatorDeposit: params.responderDeposit,
        initiatorDepositTokenAddress: params.responderDepositTokenAddress!,
        responderDeposit: params.initiatorDeposit!,
        responderDepositTokenAddress: params.initiatorDepositTokenAddress!
      },
      stateChannel
    )
  );

  await store.saveStateChannel(stateChannel.bumpProposedApps());
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
  const { store, networkContext } = requestHandler;

  const {
    data: { params, proposedByIdentifier }
  } = receivedProposeMessage;

  const {
    intermediaryIdentifier,
    proposedToIdentifier,
    responderDeposit,
    responderDepositTokenAddress,
    initiatorDeposit,
    initiatorDepositTokenAddress
  } = params;

  const multisigAddress = getCreate2MultisigAddress(
    [proposedByIdentifier, proposedToIdentifier],
    networkContext.ProxyFactory,
    networkContext.MinimumViableMultisig
  );

  const stateChannel = await getOrCreateStateChannelBetweenVirtualAppParticipants(
    multisigAddress,
    proposedByIdentifier,
    proposedToIdentifier,
    intermediaryIdentifier,
    store,
    networkContext
  );

  await store.addVirtualAppInstanceProposal(
    new AppInstanceProposal(
      {
        ...params,
        proposedByIdentifier,
        initiatorDeposit: responderDeposit,
        initiatorDepositTokenAddress: responderDepositTokenAddress!,
        responderDeposit: initiatorDeposit,
        responderDepositTokenAddress: initiatorDepositTokenAddress!
      },
      stateChannel
    )
  );

  await store.saveStateChannel(stateChannel.bumpProposedApps());
}
