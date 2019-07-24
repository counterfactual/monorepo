import { Node, SolidityABIEncoderV2Type } from "@counterfactual/types";
import { INVALID_ARGUMENT } from "ethers/errors";
import Queue from "p-queue";
import { jsonRpcMethod } from "rpc-server";

import { InstructionExecutor, Protocol } from "../../../machine";
import { StateChannel } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { Store } from "../../../store";
import { NODE_EVENTS, UpdateStateMessage } from "../../../types";
import { getCounterpartyAddress } from "../../../utils";
import { NodeController } from "../../controller";
import {
  IMPROPERLY_FORMATTED_STRUCT,
  INVALID_ACTION,
  NO_APP_INSTANCE_FOR_TAKE_ACTION,
  STATE_OBJECT_NOT_ENCODABLE
} from "../../errors";

export default class TakeActionController extends NodeController {
  public static readonly methodName = Node.MethodName.TAKE_ACTION;

  @jsonRpcMethod("chan_takeAction")
  public executeMethod = super.executeMethod;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.TakeActionParams
  ): Promise<Queue[]> {
    const { store } = requestHandler;
    const { appInstanceId } = params;

    return [
      requestHandler.getShardedQueue(
        await store.getMultisigAddressFromAppInstance(appInstanceId)
      )
    ];
  }

  protected async beforeExecution(
    requestHandler: RequestHandler,
    params: Node.TakeActionParams
  ): Promise<void> {
    const { store } = requestHandler;
    const { appInstanceId, action } = params;

    if (!appInstanceId) {
      throw new Error(NO_APP_INSTANCE_FOR_TAKE_ACTION);
    }

    const appInstance = await store.getAppInstance(appInstanceId);

    try {
      appInstance.encodeAction(action);
    } catch (e) {
      if (e.code === INVALID_ARGUMENT) {
        throw new Error(`${IMPROPERLY_FORMATTED_STRUCT}: ${e}`);
      }
      throw new Error(STATE_OBJECT_NOT_ENCODABLE);
    }
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.TakeActionParams
  ): Promise<Node.TakeActionResult> {
    const { store, publicIdentifier, instructionExecutor } = requestHandler;
    const { appInstanceId, action } = params;

    const sc = await store.getChannelFromAppInstanceID(appInstanceId);

    const responderXpub = getCounterpartyAddress(
      publicIdentifier,
      sc.userNeuteredExtendedKeys
    );

    await runTakeActionProtocol(
      appInstanceId,
      store,
      instructionExecutor,
      publicIdentifier,
      responderXpub,
      action
    );

    const appInstance = await store.getAppInstance(appInstanceId);

    return { newState: appInstance.state };
  }

  protected async afterExecution(
    requestHandler: RequestHandler,
    params: Node.TakeActionParams
  ): Promise<void> {
    const { store, router, publicIdentifier } = requestHandler;
    const { appInstanceId, action } = params;

    const appInstance = await store.getAppInstance(appInstanceId);

    const msg = {
      from: publicIdentifier,
      type: NODE_EVENTS.UPDATE_STATE,
      data: { appInstanceId, action, newState: appInstance.state }
    } as UpdateStateMessage;

    await router.emit(msg.type, msg, "outgoing");
  }
}

async function runTakeActionProtocol(
  appIdentityHash: string,
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatorXpub: string,
  responderXpub: string,
  action: SolidityABIEncoderV2Type
) {
  const stateChannel = await store.getChannelFromAppInstanceID(appIdentityHash);

  let stateChannelsMap: Map<string, StateChannel>;

  try {
    stateChannelsMap = await instructionExecutor.initiateProtocol(
      Protocol.TakeAction,
      new Map<string, StateChannel>([
        [stateChannel.multisigAddress, stateChannel]
      ]),
      {
        initiatorXpub,
        responderXpub,
        appIdentityHash,
        action,
        multisigAddress: stateChannel.multisigAddress
      }
    );
  } catch (e) {
    if (e.toString().indexOf("VM Exception") !== -1) {
      // TODO: Fetch the revert reason
      throw new Error(`${INVALID_ACTION}: ${e}`);
    }
    throw e;
  }

  const updatedStateChannel = stateChannelsMap.get(
    stateChannel.multisigAddress
  )!;

  await store.saveStateChannel(updatedStateChannel);

  return {};
}
