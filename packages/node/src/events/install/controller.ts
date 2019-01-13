import { install } from "../../methods/app-instance/install/operation";
import { RequestHandler } from "../../request-handler";
import { InstallMessage } from "../../types";

/**
 * This function responds to a installation proposal approval from a peer Node
 * by counter installing the AppInstance this Node proposed earlier.
 */
export async function installEventController(
  this: RequestHandler,
  nodeMsg: InstallMessage
) {
  await install(
    this.store,
    this.instructionExecutor,
    this.address,
    nodeMsg.from,
    nodeMsg.data.params
  );
}
