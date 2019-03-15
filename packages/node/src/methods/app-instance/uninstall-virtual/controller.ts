import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../../../request-handler";
import { getCounterpartyAddress } from "../../../utils";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

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
    params: Node.UninstallVirtualParams
  ) {
    const { store } = requestHandler;
    const { appInstanceId } = params;

    const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

    if (!stateChannel.hasAppInstance(appInstanceId)) {
      throw new Error(ERRORS.APP_ALREADY_UNINSTALLED(appInstanceId));
    }
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.UninstallVirtualParams
  ): Promise<Node.UninstallVirtualResult> {
    const { store, instructionExecutor, publicIdentifier } = requestHandler;
    const { appInstanceId, intermediaryIdentifier } = params;

    if (!appInstanceId) {
      return Promise.reject(ERRORS.NO_APP_INSTANCE_ID_TO_UNINSTALL);
    }

    const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

    if (!stateChannel.hasAppInstance(appInstanceId)) {
      throw new Error(ERRORS.APP_ALREADY_UNINSTALLED(appInstanceId));
    }

    const to = getCounterpartyAddress(
      publicIdentifier,
      stateChannel.userNeuteredExtendedKeys
    );

    await uninstallAppInstanceFromChannel(
      store,
      instructionExecutor,
      publicIdentifier,
      to,
      intermediaryIdentifier,
      appInstanceId
    );

    return {};
  }
}
