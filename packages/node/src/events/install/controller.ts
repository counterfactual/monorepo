import { install } from "../../methods/app-instance/install/operation";
import { NodeMessage } from "../../node";
import { RequestHandler } from "../../request-handler";

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
  // TODO: (question) Why is peerAddress set here? It is not in the description
  // of the type of params that `install` is expecting in the lines below.
  params.peerAddress = nodeMsg.from!;
  delete params.proposal;
  if (nodeMsg.data.proposal) {
    await setAppInstanceIDForProposeInstall(
      this.selfAddress,
      this.store,
      params
    );
  } else {
    await install(
      this.store,
      this.instructionExecutor,
      this.selfAddress,
      params.peerAddress,
      params
    );
  }
}
