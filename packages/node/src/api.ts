import { handleRejectProposalMessage } from "./message-handling/handle-node-message";
import { handleReceivedProtocolMessage } from "./message-handling/handle-protocol-message";
import {
  CreateChannelController,
  DepositController,
  GetAllChannelAddressesController,
  GetAppInstanceController,
  GetAppInstanceStateController,
  GetFreeBalanceStateController,
  GetInstalledAppInstancesController,
  GetProposedAppInstanceController,
  GetProposedAppInstancesController,
  GetStateChannelController,
  GetStateDepositHolderAddressController,
  GetTokenIndexedFreeBalancesController,
  InstallAppInstanceController,
  InstallVirtualAppInstanceController,
  ProposeInstallAppInstanceController,
  RejectInstallController,
  TakeActionController,
  UninstallController,
  UninstallVirtualController,
  UpdateStateController,
  WithdrawCommitmentController,
  WithdrawController
} from "./methods";
import { RequestHandler } from "./request-handler";
import RpcRouter from "./rpc-router";
import { NODE_EVENTS } from "./types";

const controllers = [
  /**
   * Stateful / interactive methods
   */
  CreateChannelController,
  DepositController,
  InstallAppInstanceController,
  InstallVirtualAppInstanceController,
  ProposeInstallAppInstanceController,
  RejectInstallController,
  TakeActionController,
  UninstallController,
  UninstallVirtualController,
  UpdateStateController,
  WithdrawCommitmentController,
  WithdrawController,

  /**
   * Constant methods
   */
  GetAllChannelAddressesController,
  GetAppInstanceController,
  GetAppInstanceStateController,
  GetFreeBalanceStateController,
  GetTokenIndexedFreeBalancesController,
  GetInstalledAppInstancesController,
  GetProposedAppInstanceController,
  GetProposedAppInstancesController,
  GetStateDepositHolderAddressController,
  GetStateChannelController
];

/**
 * Converts the array of connected controllers into a map of
 * Node.MethodNames to the _executeMethod_ method of a controller.
 *
 * Throws a runtime error when package is imported if multiple
 * controllers overlap (should be caught by compiler anyway).
 */
export const methodNameToImplementation = controllers.reduce(
  (acc, controller) => {
    if (!controller.methodName) {
      return acc;
    }

    if (acc[controller.methodName]) {
      throw Error(
        `Fatal: Multiple controllers connected to ${controller.methodName}`
      );
    }

    const handler = new controller();

    acc[controller.methodName] = handler.executeMethod.bind(handler);

    return acc;
  },
  {}
);

export const createRpcRouter = (requestHandler: RequestHandler) =>
  new RpcRouter({ controllers, requestHandler });
