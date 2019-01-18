import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import installAppInstanceController from "../install/controller";

export default async function installVirtualAppInstanceController(
  requestHandler: RequestHandler,
  params: Node.InstallVirtualParams
): Promise<Node.InstallVirtualResult> {
  // TODO: temp workaround to get client-side facing calls working
  // until we integrate the machine into this call
  return await installAppInstanceController(requestHandler, params);
}
