import { Node, SolidityABIEncoderV2Struct } from "@counterfactual/types";
import { INVALID_ARGUMENT } from "ethers/errors";
import Queue from "p-queue";

import { InstructionExecutor, StateChannel } from "../../../machine";
import { RequestHandler } from "../../../request-handler";
import { Store } from "../../../store";
import { NODE_EVENTS, UpdateStateMessage } from "../../../types";
import { getCounterpartyAddress } from "../../../utils";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

export default class UpdateStateController extends NodeController {
  public static readonly methodName = Node.MethodName.UPDATE_STATE;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.UpdateStateParams
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
    params: Node.UpdateStateParams
  ): Promise<void> {
    const { store } = requestHandler;
    const { appInstanceId, newState } = params;

    if (!appInstanceId) {
      return Promise.reject(ERRORS.NO_APP_INSTANCE_FOR_TAKE_ACTION);
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
    params: Node.UpdateStateParams
  ): Promise<Node.UpdateStateResult> {
    const { store, publicIdentifier, instructionExecutor } = requestHandler;
    const { appInstanceId, newState } = params;

    const sc = await store.getChannelFromAppInstanceID(appInstanceId);

    const respondingXpub = getCounterpartyAddress(
      publicIdentifier,
      sc.userNeuteredExtendedKeys
    );

    await runUpdateStateProtocol(
      appInstanceId,
      store,
      instructionExecutor,
      publicIdentifier,
      respondingXpub,
      newState
    );

    return { newState };
  }

  protected async afterExecution(
    requestHandler: RequestHandler,
    params: Node.UpdateStateParams
  ): Promise<void> {
    const { store, publicIdentifier, messagingService } = requestHandler;
    const { appInstanceId, newState } = params;

    const appInstanceInfo = await store.getAppInstanceInfo(appInstanceId);

    const to = getCounterpartyAddress(publicIdentifier, [
      appInstanceInfo.proposedByIdentifier,
      appInstanceInfo.proposedToIdentifier
    ]);

    await messagingService.send(to, {
      from: requestHandler.publicIdentifier,
      type: NODE_EVENTS.UPDATE_STATE,
      data: { appInstanceId, newState }
    } as UpdateStateMessage);
  }
}

async function runUpdateStateProtocol(
  appIdentityHash: string,
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingXpub: string,
  respondingXpub: string,
  newState: SolidityABIEncoderV2Struct
) {
  const stateChannel = await store.getChannelFromAppInstanceID(appIdentityHash);

  const stateChannelsMap = await instructionExecutor.runUpdateProtocol(
    new Map<string, StateChannel>([
      [stateChannel.multisigAddress, stateChannel]
    ]),
    {
      initiatingXpub,
      respondingXpub,
      appIdentityHash,
      newState,
      multisigAddress: stateChannel.multisigAddress
    }
  );

  const sc = stateChannelsMap.get(stateChannel.multisigAddress) as StateChannel;

  await store.saveStateChannel(sc);
}
