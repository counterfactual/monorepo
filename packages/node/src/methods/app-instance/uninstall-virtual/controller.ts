import { Node } from "@counterfactual/types";
import Queue from "p-queue";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import {
  getCreate2MultisigAddress,
  getFirstElementInListNotEqualTo
} from "../../../utils";
import { NodeController } from "../../controller";
import {
  APP_ALREADY_UNINSTALLED,
  NO_APP_INSTANCE_ID_TO_UNINSTALL
} from "../../errors";

import { uninstallVirtualAppInstanceFromChannel } from "./operation";

export default class UninstallVirtualController extends NodeController {
  @jsonRpcMethod(Node.RpcMethodName.UNINSTALL_VIRTUAL)
  public executeMethod = super.executeMethod;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.UninstallVirtualParams
  ): Promise<Queue[]> {
    const { store, publicIdentifier, networkContext } = requestHandler;
    const { appInstanceId, intermediaryIdentifier } = params;

    const multisigAddressForStateChannelWithIntermediary = getCreate2MultisigAddress(
      [publicIdentifier, intermediaryIdentifier],
      networkContext.ProxyFactory,
      networkContext.MinimumViableMultisig
    );

    const stateChannelWithResponding = await store.getChannelFromAppInstanceID(
      appInstanceId
    );

console.log('====== these quues are being requested now on UNINSTALL_VIRTUAL caller =====')
  console.log(stateChannelWithResponding.multisigAddress)
  console.log(multisigAddressForStateChannelWithIntermediary)
  console.log(appInstanceId)
    return [
      requestHandler.getShardedQueue(
        stateChannelWithResponding.multisigAddress
      ),
      requestHandler.getShardedQueue(
        multisigAddressForStateChannelWithIntermediary
      ),
      requestHandler.getShardedQueue(appInstanceId)
    ];
  }

  protected async beforeExecution(
    // @ts-ignore
    requestHandler: RequestHandler,
    params: Node.UninstallVirtualParams
  ) {
    const { appInstanceId } = params;

    if (!appInstanceId) {
      throw Error(NO_APP_INSTANCE_ID_TO_UNINSTALL);
    }
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.UninstallVirtualParams
  ): Promise<Node.UninstallVirtualResult> {

    console.log('RUnning UNINSTALL_VIRTUAL')
    const {
      store,
      instructionExecutor,
      publicIdentifier,
      provider
    } = requestHandler;

    const { appInstanceId, intermediaryIdentifier } = params;

    if (!appInstanceId) {
      throw Error(NO_APP_INSTANCE_ID_TO_UNINSTALL);
    }

    const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

    if (!stateChannel.hasAppInstance(appInstanceId)) {
      throw Error(APP_ALREADY_UNINSTALLED(appInstanceId));
    }

    const to = getFirstElementInListNotEqualTo(
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
