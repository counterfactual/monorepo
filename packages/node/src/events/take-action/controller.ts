import { RequestHandler } from "../../request-handler";
import { UpdateStateMessage } from "../../types";

export default async function takeActionEventController(
  requestHandler: RequestHandler,
  nodeMsg: UpdateStateMessage
) {
  await requestHandler.store.saveAppInstanceState(
    nodeMsg.data.appInstanceId,
    nodeMsg.data.newState
  );
}
