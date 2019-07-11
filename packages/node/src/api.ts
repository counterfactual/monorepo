import {
  handleReceivedInstallMessage,
  handleReceivedInstallVirtualMessage,
  handleReceivedProposalMessage,
  handleReceivedProposeVirtualMessage,
  handleRejectProposalMessage
} from "./message-handling/handle-node-message";
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
  InstallAppInstanceController,
  InstallVirtualAppInstanceController,
  ProposeInstallAppInstanceController,
  ProposeInstallVirtualAppInstanceController,
  RejectInstallController,
  TakeActionController,
  UninstallController,
  UninstallVirtualController,
  UpdateStateController,
  WithdrawController
} from "./methods";
import { RequestHandler } from "./request-handler";
import NodeRouter from "./rpc-router";
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
  ProposeInstallVirtualAppInstanceController,
  RejectInstallController,
  TakeActionController,
  UninstallController,
  UninstallVirtualController,
  UpdateStateController,
  WithdrawController,

  /**
   * Constant methods
   */
  GetAllChannelAddressesController,
  GetAppInstanceController,
  GetAppInstanceStateController,
  GetFreeBalanceStateController,
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
      throw new Error(
        `Fatal: Every controller must have a "methodName" property`
      );
    }

    if (acc[controller.methodName]) {
      throw new Error(
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
  new NodeRouter({ controllers, requestHandler });

export const eventNameToImplementation = {
  [NODE_EVENTS.INSTALL]: handleReceivedInstallMessage,
  [NODE_EVENTS.INSTALL_VIRTUAL]: handleReceivedInstallVirtualMessage,
  [NODE_EVENTS.PROPOSE_INSTALL]: handleReceivedProposalMessage,
  [NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL]: handleReceivedProposeVirtualMessage,
  [NODE_EVENTS.PROTOCOL_MESSAGE_EVENT]: handleReceivedProtocolMessage,
  [NODE_EVENTS.REJECT_INSTALL]: handleRejectProposalMessage,
  [NODE_EVENTS.REJECT_INSTALL_VIRTUAL]: handleRejectProposalMessage
};
