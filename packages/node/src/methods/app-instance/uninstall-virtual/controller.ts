import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { getCounterpartyAddress } from "../../../utils";
import { ERRORS } from "../../errors";

import { uninstallAppInstanceFromChannel } from "./operation";

export default async function uninstallVirtualController(
  requestHandler: RequestHandler,
  params: Node.UninstallVirtualParams
): Promise<Node.UninstallVirtualResult> {
  const { appInstanceId } = params;

  if (!appInstanceId) {
    return Promise.reject(ERRORS.NO_APP_INSTANCE_ID_TO_UNINSTALL);
  }

  const stateChannel = await requestHandler.store.getChannelFromAppInstanceID(
    appInstanceId
  );

  const to = getCounterpartyAddress(
    requestHandler.publicIdentifier,
    stateChannel.userNeuteredExtendedKeys
  );

  await uninstallAppInstanceFromChannel(
    requestHandler.store,
    requestHandler.instructionExecutor,
    requestHandler.publicIdentifier,
    to,
    params.intermediaryIdentifier,
    appInstanceId
  );

  return {};
}
