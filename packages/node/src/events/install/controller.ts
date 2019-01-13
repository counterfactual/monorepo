import { install } from "../../methods/app-instance/install/operation";
import { RequestHandler } from "../../request-handler";
import { NodeMessage } from "../../types";

import { setAppInstanceIDForProposeInstall } from "./operation";
/**
 * This function adds the AppInstance as a proposed installation if the proposal
 * flag is set. Otherwise it adds the AppInstance as an installed app into the
 * appropriate channel.
 */
export async function installEventController(
  this: RequestHandler,
  nodeMsg: NodeMessage
) {
  const params = { ...nodeMsg.data };
  delete params.proposal;
  if (nodeMsg.data.proposal) {
    await setAppInstanceIDForProposeInstall(this.address, this.store, {
      ...params,
      respondingAddress: nodeMsg.from!
    });
  } else {
    await install(
      this.store,
      this.instructionExecutor,
      this.address,
      params.respondingAddress,
      params
    );
  }
}
