import { Node } from "@counterfactual/types";
import Queue from "p-queue";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, ProposeVirtualMessage } from "../../../types";
import { getCreate2MultisigAddress } from "../../../utils";
import { NodeController } from "../../controller";
import { NULL_INITIAL_STATE_FOR_PROPOSAL } from "../../errors";

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

  @jsonRpcMethod(Node.RpcMethodName.PROPOSE_INSTALL_VIRTUAL)
  public executeMethod = super.executeMethod;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallVirtualParams
  ): Promise<Queue[]> {
    const { publicIdentifier, networkContext } = requestHandler;
    const { proposedToIdentifier, intermediaries } = params;

    const multisigAddress = getCreate2MultisigAddress(
      [publicIdentifier, intermediaries[0]],
      networkContext.ProxyFactory,
      networkContext.MinimumViableMultisig
    );

    const metachannelAddress = getCreate2MultisigAddress(
      [publicIdentifier, proposedToIdentifier],
      networkContext.ProxyFactory,
      networkContext.MinimumViableMultisig
    );

    return [
      requestHandler.getShardedQueue(multisigAddress),
      requestHandler.getShardedQueue(metachannelAddress)
    ];
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
      throw new Error(NULL_INITIAL_STATE_FOR_PROPOSAL);
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
