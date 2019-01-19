import { RequestHandler } from "../../request-handler";
import { RejectProposalMessage } from "../../types";

export default async function rejectInstallEventController(
  requestHandler: RequestHandler,
  msg: RejectProposalMessage
) {
  const { appInstanceId } = msg.data;
  await requestHandler.store.removeAppInstanceProposal(appInstanceId);
}
