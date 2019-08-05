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

import { uninstallVirtualAppInstanceFromChannel } from "./operation";

export default class UninstallVirtualController extends NodeController {
  public static readonly methodName = Node.MethodName.UNINSTALL_VIRTUAL;

  @jsonRpcMethod(Node.RpcMethodName.UNINSTALL_VIRTUAL)
  public executeMethod = super.executeMethod;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.UninstallVirtualParams
  ): Promise<Queue[]> {
    const { store, publicIdentifier } = requestHandler;
    const { appInstanceId } = params;

    const multisigAddressForStateChannelWithIntermediary = await store.getMultisigAddressFromOwnersHash(
      hashOfOrderedPublicIdentifiers([
        params.intermediaryIdentifier,
        publicIdentifier
      ])
    );

    const stateChannelWithResponding = await store.getChannelFromAppInstanceID(
      appInstanceId
    );

    return [
      requestHandler.getShardedQueue(
        stateChannelWithResponding.multisigAddress
      ),
      requestHandler.getShardedQueue(
        multisigAddressForStateChannelWithIntermediary
      )
    ];
  }

  protected async beforeExecution(
    // @ts-ignore
    requestHandler: RequestHandler,
    params: Node.UninstallVirtualParams
  ) {
    const { appInstanceId } = params;

    if (!appInstanceId) {
      throw new Error(NO_APP_INSTANCE_ID_TO_UNINSTALL);
    }
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.UninstallVirtualParams
  ): Promise<Node.UninstallVirtualResult> {
    const {
      store,
      instructionExecutor,
      publicIdentifier,
      provider
    } = requestHandler;

    const { appInstanceId, intermediaryIdentifier } = params;

    if (!appInstanceId) {
      throw new Error(NO_APP_INSTANCE_ID_TO_UNINSTALL);
    }

    const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

    if (!stateChannel.hasAppInstance(appInstanceId)) {
      throw new Error(APP_ALREADY_UNINSTALLED(appInstanceId));
    }

    const to = getCounterpartyAddress(
      publicIdentifier,
      stateChannel.userNeuteredExtendedKeys
    );

    await uninstallVirtualAppInstanceFromChannel(
      store,
      instructionExecutor,
      provider,
      publicIdentifier,
      to,
      intermediaryIdentifier,
      appInstanceId
    );

    return {};
  }
}
