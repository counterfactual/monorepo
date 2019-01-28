import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { InstallVirtualMessage, NODE_EVENTS } from "../../../types";

import { installVirtual } from "./operation";

export default async function installVirtualAppInstanceController(
  requestHandler: RequestHandler,
  params: Node.InstallVirtualParams
): Promise<Node.InstallVirtualResult> {
  const { appInstanceId } = params;

  const proposedAppInstanceInfo = await requestHandler.store.getProposedAppInstanceInfo(
    appInstanceId
  );

  // Sanity check
  if (params.intermediaries[0] !== proposedAppInstanceInfo.intermediaries![0]) {
    console.debug(params);
    console.debug(proposedAppInstanceInfo.intermediaries);
    throw Error("Has everybody lost their minds!?");
  }

  const appInstanceInfo = await installVirtual(
    requestHandler.store,
    requestHandler.instructionExecutor,
    requestHandler.publicIdentifier,
    proposedAppInstanceInfo.proposedByIdentifier,
    params
  );

  const installVirtualApprovalMsg: InstallVirtualMessage = {
    from: requestHandler.publicIdentifier,
    type: NODE_EVENTS.INSTALL_VIRTUAL,
    data: {
      params: {
        appInstanceId
      }
    }
  };

  await requestHandler.messagingService.send(
    proposedAppInstanceInfo.proposedByIdentifier,
    installVirtualApprovalMsg
  );

  return {
    appInstance: appInstanceInfo
  };
}
