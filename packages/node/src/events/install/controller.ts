import { ERRORS } from "../../methods/errors";
import { RequestHandler } from "../../request-handler";
import { InstallMessage } from "../../types";

/**
 * This function responds to a installation proposal approval from a peer Node
 * by counter installing the AppInstance this Node proposed earlier.
 *
 * NOTE: The following code is mostly just a copy of the code from the
 *       methods/intall/operations.ts::install method with the exception
 *       of the lack of a runInstallProtocol call. This is because this is
 *       the counterparty end of the install protocol which runs _after_
 *       the _runProtocolWithMessage_ call finishes and saves the result.
 *
 *       Future iterations of this code will simply be a middleware hook on
 *       the _STATE TRANSITION COMMIT_ opcode.
 */
export default async function installEventController(
  requestHandler: RequestHandler,
  nodeMsg: InstallMessage
) {
  const store = requestHandler.store;

  const { appInstanceId } = nodeMsg.data.params;

  if (!appInstanceId || !appInstanceId.trim()) {
    throw new Error(ERRORS.NO_APP_INSTANCE_ID_TO_INSTALL);
  }

  const appInstanceInfo = await store.getProposedAppInstanceInfo(appInstanceId);

  await store.saveRealizedProposedAppInstance(appInstanceInfo);

  return appInstanceInfo;
}
