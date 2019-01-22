import { RequestHandler } from "../../request-handler";
import { RejectProposalMessage } from "../../types";

export default async function rejectInstallVirtualEventController(
  requestHandler: RequestHandler,
  msg: RejectProposalMessage
) {
  const { appInstanceId } = msg.data;
  await requestHandler.store.removeAppInstanceProposal(appInstanceId);
}
