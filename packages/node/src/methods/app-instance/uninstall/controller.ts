import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, UninstallMessage } from "../../../types";
import { getAliceBobMap, getCounterpartyAddress } from "../../../utils";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

import {
  computeFreeBalanceIncrements,
  uninstallAppInstanceFromChannel
} from "./operation";

export default class UninstallController extends NodeController {
  public static readonly methodName = Node.MethodName.UNINSTALL;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.UninstallVirtualParams
  ): Promise<Queue> {
    const { store } = requestHandler;
    const { appInstanceId } = params;
    return requestHandler.getShardedQueue(
      await store.getMultisigAddressFromAppInstanceID(appInstanceId)
    );
  }

  protected async beforeExecution(
    requestHandler: RequestHandler,
    params: Node.UninstallParams,
    context: object
  ): Promise<void> {
    const { provider, store } = requestHandler;
    const { appInstanceId } = params;

    const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

    const ethIncrementsMap = await computeFreeBalanceIncrements(
      stateChannel,
      appInstanceId,
      provider
    );

    const aliceBobMap = getAliceBobMap(stateChannel);

    context["aliceBalanceIncrement"] = ethIncrementsMap[aliceBobMap.alice];
    context["bobBalanceIncrement"] = ethIncrementsMap[aliceBobMap.bob];
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.UninstallParams,
    context: object
  ): Promise<Node.UninstallResult> {
    const {
      store,
      instructionExecutor,
      publicIdentifier,
      messagingService
    } = requestHandler;
    const { appInstanceId } = params;

    if (!appInstanceId) {
      return Promise.reject(ERRORS.NO_APP_INSTANCE_ID_TO_UNINSTALL);
    }

    const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

    const to = getCounterpartyAddress(
      publicIdentifier,
      stateChannel.userNeuteredExtendedKeys
    );

    await uninstallAppInstanceFromChannel(
      store,
      instructionExecutor,
      publicIdentifier,
      to,
      appInstanceId,
      context["aliceBalanceIncrement"],
      context["bobBalanceIncrement"]
    );

    const uninstallMsg: UninstallMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.UNINSTALL,
      data: {
        appInstanceId
      }
    };

    await messagingService.send(to, uninstallMsg);

    return {};
  }
}
