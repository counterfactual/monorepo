import { AppInstanceProposal } from "../models";
import { RequestHandler } from "../request-handler";
import { ProposeMessage, RejectProposalMessage } from "../types";
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

  const stateChannel = await store.getOrCreateStateChannelBetweenVirtualAppParticipants(
    multisigAddress,
    publicIdentifier,
    proposedByIdentifier
  );

  const proposal = new AppInstanceProposal(
    {
      ...params,
      proposedByIdentifier,
      initiatorDeposit: params.responderDeposit,
      initiatorDepositTokenAddress: params.responderDepositTokenAddress!,
      responderDeposit: params.initiatorDeposit!,
      responderDepositTokenAddress: params.initiatorDepositTokenAddress!
    },
    stateChannel
  );

  await store.saveStateChannel(stateChannel.addProposal(proposal));
}

export async function handleRejectProposalMessage(
  requestHandler: RequestHandler,
  receivedRejectProposalMessage: RejectProposalMessage
) {
  const { store } = requestHandler;
  const {
    data: { appInstanceId }
  } = receivedRejectProposalMessage;

  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  await store.saveStateChannel(stateChannel.removeProposal(appInstanceId));
}
