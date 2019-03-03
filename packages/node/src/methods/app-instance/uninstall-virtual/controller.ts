import { xkeyKthAddress } from "@counterfactual/machine";
import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../../../request-handler";
import {
  getAlice,
  getAliceBobMap,
  getCounterpartyAddress
} from "../../../utils";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";
import { computeFreeBalanceIncrements } from "../uninstall/operation";

import { uninstallAppInstanceFromChannel } from "./operation";

export default class UninstallVirtualController extends NodeController {
  public static readonly methodName = Node.MethodName.UNINSTALL_VIRTUAL;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.UninstallVirtualParams
  ): Promise<Queue> {
    const { store } = requestHandler;
    const { appInstanceId } = params;

    const metachannel = await store.getChannelFromAppInstanceID(appInstanceId);

    // TODO: Also shard based on channel with intermediary. This should
    //       prevent all updates to the channel with the intermediary &
    //       the virtual app itself.

    return requestHandler.getShardedQueue(metachannel.multisigAddress);
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
    params: Node.UninstallVirtualParams,
    context: object
  ): Promise<Node.UninstallVirtualResult> {
    const { store, instructionExecutor, publicIdentifier } = requestHandler;
    const { appInstanceId, intermediaryIdentifier } = params;

    if (!appInstanceId) {
      return Promise.reject(ERRORS.NO_APP_INSTANCE_ID_TO_UNINSTALL);
    }

    const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

    const to = getCounterpartyAddress(
      publicIdentifier,
      stateChannel.userNeuteredExtendedKeys
    );

    const aliceIsInitiating =
      getAlice(stateChannel) ===
      xkeyKthAddress(requestHandler.publicIdentifier, 0);

    await uninstallAppInstanceFromChannel(
      store,
      instructionExecutor,
      publicIdentifier,
      to,
      intermediaryIdentifier,
      appInstanceId,
      aliceIsInitiating
        ? context["aliceBalanceIncrement"]
        : context["bobBalanceIncrement"],
      aliceIsInitiating
        ? context["bobBalanceIncrement"]
        : context["aliceBalanceIncrement"]
    );

    return {};
  }
}
