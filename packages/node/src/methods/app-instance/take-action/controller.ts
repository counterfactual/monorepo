import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { ERRORS } from "../../errors";

export default async function takeActionController(
  requestHandler: RequestHandler,
  params: Node.TakeActionParams
): Promise<Node.TakeActionResult> {
  if (!params.appInstanceId) {
    return Promise.reject(ERRORS.NO_APP_INSTANCE_FOR_TAKE_ACTION);
  }

  return {
    newState: {}
  };
}
