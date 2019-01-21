import { RequestHandler } from "../../request-handler";
import { TakeActionMessage } from "../../types";

export default async function takeActionEventController(
  requestHandler: RequestHandler,
  nodeMsg: TakeActionMessage
) {
  await requestHandler.store.saveAppInstanceState(
    nodeMsg.data.appInstanceId,
    nodeMsg.data.params.newState
  );
}
