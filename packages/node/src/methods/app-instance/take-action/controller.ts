import { Node, SolidityValueType } from "@counterfactual/types";
import { INVALID_ARGUMENT } from "ethers/errors";
import Queue from "p-queue";
import { jsonRpcMethod } from "rpc-server";

import { Protocol, ProtocolRunner } from "../../../machine";
import { StateChannel } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { Store } from "../../../store";
import { NODE_EVENTS, UpdateStateMessage } from "../../../types";
import {
  getFirstElementInListNotEqualTo,
  prettyPrintObject
} from "../../../utils";
import { NodeController } from "../../controller";
import {
  IMPROPERLY_FORMATTED_STRUCT,
  INVALID_ACTION,
  NO_APP_INSTANCE_FOR_TAKE_ACTION,
  STATE_OBJECT_NOT_ENCODABLE
} from "../../errors";

export default class TakeActionController extends NodeController {
  @jsonRpcMethod(Node.RpcMethodName.TAKE_ACTION)
  public executeMethod = super.executeMethod;

  protected async getShardKeysForQueueing(
    // @ts-ignore
    requestHandler: RequestHandler,
    params: Node.TakeActionParams
  ): Promise<string[]> {
    return [params.appInstanceId];
  }

  protected async beforeExecution(
    requestHandler: RequestHandler,
    params: Node.TakeActionParams
  ): Promise<void> {
    const { store } = requestHandler;
    const { appInstanceId, action } = params;

    if (!appInstanceId) {
      throw Error(NO_APP_INSTANCE_FOR_TAKE_ACTION);
    }

    const appInstance = await store.getAppInstance(appInstanceId);

    try {
      appInstance.encodeAction(action);
    } catch (e) {
      if (e.code === INVALID_ARGUMENT) {
        throw Error(`${IMPROPERLY_FORMATTED_STRUCT}: ${prettyPrintObject(e)}`);
      }
      throw Error(STATE_OBJECT_NOT_ENCODABLE);
    }
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.TakeActionParams
  ): Promise<Node.TakeActionResult> {
    const { store, publicIdentifier, protocolRunner } = requestHandler;
    const { appInstanceId, action } = params;

    const sc = await store.getChannelFromAppInstanceID(appInstanceId);

    const responderXpub = getFirstElementInListNotEqualTo(
      publicIdentifier,
      sc.userNeuteredExtendedKeys
    );

    await runTakeActionProtocol(
      appInstanceId,
      store,
      protocolRunner,
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
  protocolRunner: ProtocolRunner,
  initiatorXpub: string,
  responderXpub: string,
  action: SolidityValueType
) {
  const stateChannel = await store.getChannelFromAppInstanceID(appIdentityHash);

  let stateChannelsMap: Map<string, StateChannel>;

  try {
    stateChannelsMap = await protocolRunner.initiateProtocol(
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
      throw Error(`${INVALID_ACTION}: ${prettyPrintObject(e)}`);
    }
    throw Error(prettyPrintObject(e));
  }

  const updatedStateChannel = stateChannelsMap.get(
    stateChannel.multisigAddress
  )!;

  await store.saveStateChannel(updatedStateChannel);

  return {};
}
