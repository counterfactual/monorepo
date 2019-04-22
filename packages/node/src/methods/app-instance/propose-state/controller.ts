import { Node } from "@counterfactual/types";
import { INVALID_ARGUMENT } from "ethers/errors";
import Queue from "p-queue";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, UpdateStateMessage } from "../../../types";
import { getCounterpartyAddress } from "../../../utils";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

export default class ProposeStateController extends NodeController {
  public static readonly methodName = Node.MethodName.PROPOSE_STATE;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.StateProposalParams
  ): Promise<Queue[]> {
    const { store } = requestHandler;
    const { appInstanceId } = params;

    return [
      requestHandler.getShardedQueue(
        await store.getMultisigAddressFromAppInstanceID(appInstanceId)
      )
    ];
  }

  protected async beforeExecution(
    requestHandler: RequestHandler,
    params: Node.StateProposalParams
  ): Promise<void> {
    const { store } = requestHandler;
    const { appInstanceId, newState } = params;

    if (!appInstanceId) {
      return Promise.reject(ERRORS.NO_APP_INSTANCE_FOR_STATE_PROPOSAL);
    }

    const appInstance = await store.getAppInstance(appInstanceId);

    try {
      appInstance.encodeState(newState);
    } catch (e) {
      if (e.code === INVALID_ARGUMENT) {
        return Promise.reject(`${ERRORS.IMPROPERLY_FORMATTED_STRUCT}: ${e}`);
      }
      return Promise.reject(ERRORS.STATE_OBJECT_NOT_ENCODABLE);
    }
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.StateProposalParams
  ): Promise<Node.StateProposalResult> {
    const {
      store,
      publicIdentifier,
      messagingService,
      outgoing
    } = requestHandler;
    const { appInstanceId, newState } = params;

    const appInstanceInfo = await store.getAppInstanceInfo(appInstanceId);

    const to = getCounterpartyAddress(publicIdentifier, [
      appInstanceInfo.proposedByIdentifier,
      appInstanceInfo.proposedToIdentifier
    ]);

    const msg = {
      from: requestHandler.publicIdentifier,
      type: NODE_EVENTS.UPDATE_STATE,
      data: { appInstanceId, newState }
    } as UpdateStateMessage;

    await messagingService.send(to, msg);

    outgoing.emit(msg.type, msg);

    return;
  }
}
