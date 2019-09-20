import { Node, SolidityValueType } from "@counterfactual/types";
import { INVALID_ARGUMENT } from "ethers/errors";
import { jsonRpcMethod } from "rpc-server";

import { Engine, Protocol } from "../../../machine";
import { StateChannel } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { Store } from "../../../store";
import {
  getFirstElementInListNotEqualTo,
  prettyPrintObject
} from "../../../utils";
import { NodeController } from "../../controller";
import {
  IMPROPERLY_FORMATTED_STRUCT,
  NO_APP_INSTANCE_FOR_TAKE_ACTION,
  STATE_OBJECT_NOT_ENCODABLE
} from "../../errors";

export default class UpdateStateController extends NodeController {
  @jsonRpcMethod(Node.RpcMethodName.UPDATE_STATE)
  public executeMethod = super.executeMethod;

  protected async getRequiredLockNames(
    // @ts-ignore
    requestHandler: RequestHandler,
    params: Node.UpdateStateParams
  ): Promise<string[]> {
    return [params.appInstanceId];
  }

  protected async beforeExecution(
    requestHandler: RequestHandler,
    params: Node.UpdateStateParams
  ): Promise<void> {
    const { store } = requestHandler;
    const { appInstanceId, newState } = params;

    if (!appInstanceId) {
      throw Error(NO_APP_INSTANCE_FOR_TAKE_ACTION);
    }

    const appInstance = await store.getAppInstance(appInstanceId);

    try {
      appInstance.encodeState(newState);
    } catch (e) {
      if (e.code === INVALID_ARGUMENT) {
        throw Error(`${IMPROPERLY_FORMATTED_STRUCT}: ${prettyPrintObject(e)}`);
      }
      throw Error(STATE_OBJECT_NOT_ENCODABLE);
    }
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.UpdateStateParams
  ): Promise<Node.UpdateStateResult> {
    const { store, publicIdentifier, engine } = requestHandler;
    const { appInstanceId, newState } = params;

    const sc = await store.getChannelFromAppInstanceID(appInstanceId);

    const responderXpub = getFirstElementInListNotEqualTo(
      publicIdentifier,
      sc.userNeuteredExtendedKeys
    );

    await runUpdateStateProtocol(
      appInstanceId,
      store,
      engine,
      publicIdentifier,
      responderXpub,
      newState
    );

    return { newState };
  }
}

async function runUpdateStateProtocol(
  appIdentityHash: string,
  store: Store,
  engine: Engine,
  initiatorXpub: string,
  responderXpub: string,
  newState: SolidityValueType
) {
  const stateChannel = await store.getChannelFromAppInstanceID(appIdentityHash);

  const stateChannelsMap = await engine.initiateProtocol(
    Protocol.Update,
    new Map<string, StateChannel>([
      [stateChannel.multisigAddress, stateChannel]
    ]),
    {
      initiatorXpub,
      responderXpub,
      appIdentityHash,
      newState,
      multisigAddress: stateChannel.multisigAddress
    }
  );
}
