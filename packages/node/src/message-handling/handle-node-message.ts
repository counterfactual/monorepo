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
