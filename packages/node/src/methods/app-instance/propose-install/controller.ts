import { Node } from "@counterfactual/types";
import Queue from "p-queue";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, ProposeMessage } from "../../../types";
import { hashOfOrderedPublicIdentifiers } from "../../../utils";
import { NodeController } from "../../controller";
import { NULL_INITIAL_STATE_FOR_PROPOSAL } from "../../errors";

import { createProposedAppInstance } from "./operation";

/**
 * This creates an entry of a proposed AppInstance while sending the proposal
 * to the peer with whom this AppInstance is specified to be installed.
 * @param params
 * @returns The AppInstanceId for the proposed AppInstance
 */
export default class ProposeInstallController extends NodeController {
  public static readonly methodName = Node.MethodName.PROPOSE_INSTALL;

  @jsonRpcMethod("chan_proposeInstall")
  public executeMethod = super.executeMethod;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallParams
  ): Promise<Queue[]> {
    const { store } = requestHandler;
    const { proposedToIdentifier } = params;

    const multisigAddress = await store.getMultisigAddressFromOwnersHash(
      hashOfOrderedPublicIdentifiers([
        requestHandler.publicIdentifier,
        proposedToIdentifier
      ])
    );

    return [
      requestHandler.getShardedQueue(
        await store.getMultisigAddressFromAppInstanceID(multisigAddress)
      )
    ];
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallParams
  ): Promise<Node.ProposeInstallResult> {
    const { store, publicIdentifier, messagingService } = requestHandler;
    const { initialState } = params;

    if (!initialState) {
      return Promise.reject(NULL_INITIAL_STATE_FOR_PROPOSAL);
    }

    const appInstanceId = await createProposedAppInstance(
      publicIdentifier,
      store,
      params
    );

    const proposalMsg: ProposeMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.PROPOSE_INSTALL,
      data: { params, appInstanceId }
    };

    await messagingService.send(params.proposedToIdentifier, proposalMsg);

    return {
      appInstanceId
    };
  }
}
