import { Node } from "@counterfactual/types";
import Queue from "p-queue";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import {
  getCounterpartyAddress,
  hashOfOrderedPublicIdentifiers
} from "../../../utils";
import { NodeController } from "../../controller";
import {
  APP_ALREADY_UNINSTALLED,
  NO_APP_INSTANCE_ID_TO_UNINSTALL
} from "../../errors";

import { uninstallAppInstanceFromChannel } from "./operation";

export default class UninstallVirtualController extends NodeController {
  public static readonly methodName = Node.MethodName.UNINSTALL_VIRTUAL;

  @jsonRpcMethod(Node.RpcMethodName.UNINSTALL_VIRTUAL)
  public executeMethod = super.executeMethod;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.UninstallVirtualParams
  ): Promise<Queue[]> {
    const { store } = requestHandler;
    const { appInstanceId } = params;

    const multisigAddress = await store.getMultisigAddressFromOwnersHash(
      hashOfOrderedPublicIdentifiers([
        params.intermediaryIdentifier,
        requestHandler.publicIdentifier
      ])
    );

    const metachannel = await store.getChannelFromstring(appInstanceId);

    return [
      requestHandler.getShardedQueue(metachannel.multisigAddress),
      requestHandler.getShardedQueue(multisigAddress)
    ];
  }

  protected async beforeExecution(
    requestHandler: RequestHandler,
    params: Node.UninstallVirtualParams
  ) {
    const { store } = requestHandler;
    const { appInstanceId } = params;

    const stateChannel = await store.getChannelFromstring(appInstanceId);

    if (!stateChannel.hasAppInstance(appInstanceId)) {
      throw new Error(APP_ALREADY_UNINSTALLED(appInstanceId));
    }
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.UninstallVirtualParams
  ): Promise<Node.UninstallVirtualResult> {
    const { store, instructionExecutor, publicIdentifier } = requestHandler;
    const { appInstanceId, intermediaryIdentifier } = params;

    if (!appInstanceId) {
      return Promise.reject(NO_APP_INSTANCE_ID_TO_UNINSTALL);
    }

    const stateChannel = await store.getChannelFromstring(appInstanceId);

    if (!stateChannel.hasAppInstance(appInstanceId)) {
      throw new Error(APP_ALREADY_UNINSTALLED(appInstanceId));
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
