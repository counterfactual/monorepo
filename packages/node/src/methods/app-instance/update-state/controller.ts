import { Node, SolidityABIEncoderV2Type } from "@counterfactual/types";
import { INVALID_ARGUMENT } from "ethers/errors";
import Queue from "p-queue";

import { InstructionExecutor } from "../../../machine";
import { StateChannel } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { Store } from "../../../store";
import { getCounterpartyAddress } from "../../../utils";
import { NodeController } from "../../controller";
import {
  IMPROPERLY_FORMATTED_STRUCT,
  NO_APP_INSTANCE_FOR_TAKE_ACTION,
  STATE_OBJECT_NOT_ENCODABLE
} from "../../errors";

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
        await store.getMultisigAddressFromstring(appInstanceId)
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
      return Promise.reject(NO_APP_INSTANCE_FOR_TAKE_ACTION);
    }

    const appInstance = await store.getAppInstance(appInstanceId);

    try {
      appInstance.encodeState(newState);
    } catch (e) {
      if (e.code === INVALID_ARGUMENT) {
        return Promise.reject(`${IMPROPERLY_FORMATTED_STRUCT}: ${e}`);
      }
      return Promise.reject(STATE_OBJECT_NOT_ENCODABLE);
    }
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.UpdateStateParams
  ): Promise<Node.UpdateStateResult> {
    const { store, publicIdentifier, instructionExecutor } = requestHandler;
    const { appInstanceId, newState } = params;

    const sc = await store.getChannelFromstring(appInstanceId);

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
}

async function runUpdateStateProtocol(
  appIdentityHash: string,
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingXpub: string,
  respondingXpub: string,
  newState: SolidityABIEncoderV2Type
) {
  const stateChannel = await store.getChannelFromstring(appIdentityHash);

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
