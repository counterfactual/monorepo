import { Node } from "@counterfactual/types";
import Queue from "p-queue";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, ProposeVirtualMessage } from "../../../types";
import { hashOfOrderedPublicIdentifiers } from "../../../utils";
import { NodeController } from "../../controller";
import {
  NO_MULTISIG_FOR_APP_INSTANCE_ID,
  NULL_INITIAL_STATE_FOR_PROPOSAL
} from "../../errors";

import {
  createProposedVirtualAppInstance,
  getNextNodeAddress
} from "./operation";

/**
 * This creates an entry of a proposed Virtual AppInstance while sending the
 * proposal to the intermediaries and the responder Node.
 * @param params
 * @returns The AppInstanceId for the proposed AppInstance
 */
export default class ProposeInstallVirtualController extends NodeController {
  public static readonly methodName = Node.MethodName.PROPOSE_INSTALL_VIRTUAL;

  @jsonRpcMethod("chan_proposeInstallVirtual")
  public executeMethod = super.executeMethod;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallVirtualParams
  ): Promise<Queue[]> {
    const { store } = requestHandler;
    const { proposedToIdentifier } = params;

    const multisigAddress = await store.getMultisigAddressFromOwnersHash(
      hashOfOrderedPublicIdentifiers([
        requestHandler.publicIdentifier,
        params.intermediaries[0]
      ])
    );

    const queues = [requestHandler.getShardedQueue(multisigAddress)];

    try {
      const metachannelAddress = await store.getMultisigAddressFromOwnersHash(
        hashOfOrderedPublicIdentifiers([
          requestHandler.publicIdentifier,
          proposedToIdentifier
        ])
      );
      queues.push(requestHandler.getShardedQueue(metachannelAddress));
    } catch (e) {
      // It is possible the metachannel has never been created
      if (e !== NO_MULTISIG_FOR_APP_INSTANCE_ID) throw e;
    }

    return queues;
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallVirtualParams
  ): Promise<Node.ProposeInstallVirtualResult> {
    const {
      store,
      publicIdentifier,
      messagingService,
      networkContext
    } = requestHandler;
    const { initialState } = params;

    if (!initialState) {
      return Promise.reject(NULL_INITIAL_STATE_FOR_PROPOSAL);
    }
    // TODO: check if channel is open with the first intermediary
    // and that there are sufficient funds

    // TODO: Also create the proposed eth virtual app agreement

    const appInstanceId = await createProposedVirtualAppInstance(
      publicIdentifier,
      store,
      params,
      networkContext
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
