import { RequestHandler } from "../request-handler";
import { RejectProposalMessage } from "../types";

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
