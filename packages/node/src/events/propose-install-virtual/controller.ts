import { RequestHandler } from "../../request-handler";
import { ProposeVirtualMessage } from "../../types";

import { setAppInstanceIDForProposeInstallVirtual } from "./operation";

export async function proposeInstallVirtualEventController(
  this: RequestHandler,
  nodeMsg: ProposeVirtualMessage
) {
  await setAppInstanceIDForProposeInstallVirtual(
    this.address,
    this.store,
    nodeMsg.data.params,
    nodeMsg.data.appInstanceId,
    nodeMsg.from!
  );
}
