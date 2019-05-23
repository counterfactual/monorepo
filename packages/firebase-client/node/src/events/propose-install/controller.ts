import { RequestHandler } from "../../request-handler";
import { ProposeMessage } from "../../types";

import { setAppInstanceIDForProposeInstall } from "./operation";

export default async function proposeInstallEventController(
  requestHandler: RequestHandler,
  nodeMsg: ProposeMessage
) {
  await setAppInstanceIDForProposeInstall(
    requestHandler.publicIdentifier,
    requestHandler.store,
    nodeMsg.data.params,
    nodeMsg.data.appInstanceId,
    nodeMsg.from!
  );
}
