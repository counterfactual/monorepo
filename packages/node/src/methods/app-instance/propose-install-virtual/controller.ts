import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, ProposeVirtualMessage } from "../../../types";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

import {
  createProposedVirtualAppInstance,
  getNextNodeAddress
} from "./operation";

/**
 * This creates an entry of a proposed Virtual AppInstance while sending the
 * proposal to the intermediaries and the responding Node.
 * @param params
 * @returns The AppInstanceId for the proposed AppInstance
 */
export default class ProposeInstallVirtualController extends NodeController {
  public static readonly methodName = Node.MethodName.PROPOSE_INSTALL_VIRTUAL;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallVirtualParams
  ): Promise<Queue> {
    return requestHandler.getShardedQueue("proposals");
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallVirtualParams
  ): Promise<Node.ProposeInstallVirtualResult> {
    const { store, publicIdentifier, messagingService } = requestHandler;
    const { initialState } = params;

    if (!initialState) {
      return Promise.reject(ERRORS.NULL_INITIAL_STATE_FOR_PROPOSAL);
    }
    // TODO: check if channel is open with the first intermediary
    // and that there are sufficient funds

    // TODO: Also create the proposed eth virtual app agreement

    const appInstanceId = await createProposedVirtualAppInstance(
      publicIdentifier,
      store,
      params
    );

    const proposalMsg: ProposeVirtualMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
      data: {
        params,
        appInstanceId,
        proposedByIdentifier: publicIdentifier
      }
    };

    const nextNodeAddress = getNextNodeAddress(
      publicIdentifier,
      params.intermediaries,
      params.proposedToIdentifier
    );

    await messagingService.send(nextNodeAddress, proposalMsg);

    return {
      appInstanceId
    };
  }
}
