import { RequestHandler } from "../../request-handler";
import { ProposeMessage } from "../../types";

import { setAppInstanceIDForProposeInstall } from "./operation";

export async function proposeInstallEventController(
  this: RequestHandler,
  nodeMsg: ProposeMessage
) {
  await setAppInstanceIDForProposeInstall(
    this.address,
    this.store,
    nodeMsg.data.params,
    nodeMsg.data.appInstanceId,
    nodeMsg.from!
  );
}
