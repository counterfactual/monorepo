import { install } from "../../methods/app-instance/install/operation";
import { RequestHandler } from "../../request-handler";
import { InstallMessage } from "../../types";

/**
 * This function responds to a installation proposal approval from a peer Node
 * by counter installing the AppInstance this Node proposed earlier.
 */
export default async function installEventController(
  requestHandler: RequestHandler,
  nodeMsg: InstallMessage
) {
  await install(
    requestHandler.store,
    requestHandler.instructionExecutor,
    requestHandler.address,
    nodeMsg.from,
    nodeMsg.data.params
  );
}
