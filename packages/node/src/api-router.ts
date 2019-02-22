import {
  addChannelController,
  depositEventController,
  installEventController,
  installVirtualEventController,
  proposeInstallEventController,
  proposeInstallVirtualEventController,
  protocolMessageEventController,
  rejectInstallEventController,
  rejectInstallVirtualEventController,
  takeActionEventController
} from "./events";
import {
  CreateChannelController,
  DepositController,
  GetAllChannelAddressesController,
  GetAppInstanceController,
  GetAppInstanceStateController,
  GetFreeBalanceStateController,
  GetInstalledAppInstancesController,
  GetProposedAppInstancesController,
  InstallAppInstanceController,
  InstallVirtualAppInstanceController,
  ProposeInstallAppInstanceController,
  ProposeInstallVirtualAppInstanceController,
  RejectInstallController,
  TakeActionController,
  UninstallController,
  UninstallVirtualController,
  WithdrawController
} from "./methods";
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
  WithdrawController,

  /**
   * Constant methods
   */
  GetAllChannelAddressesController,
  GetAppInstanceController,
  GetAppInstanceStateController,
  GetFreeBalanceStateController,
  GetInstalledAppInstancesController,
  GetProposedAppInstancesController
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

export const eventNameToImplementation = {
  [NODE_EVENTS.CREATE_CHANNEL]: addChannelController,
  [NODE_EVENTS.DEPOSIT_CONFIRMED]: depositEventController,
  [NODE_EVENTS.INSTALL]: installEventController,
  [NODE_EVENTS.INSTALL_VIRTUAL]: installVirtualEventController,
  [NODE_EVENTS.PROPOSE_INSTALL]: proposeInstallEventController,
  [NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL]: proposeInstallVirtualEventController,
  [NODE_EVENTS.UPDATE_STATE]: takeActionEventController,
  [NODE_EVENTS.PROTOCOL_MESSAGE_EVENT]: protocolMessageEventController,
  [NODE_EVENTS.REJECT_INSTALL]: rejectInstallEventController,
  [NODE_EVENTS.REJECT_INSTALL_VIRTUAL]: rejectInstallVirtualEventController,
  // TODO: Remove no-ops of obsolete functions
  [NODE_EVENTS.UNINSTALL]: () => {},
  [NODE_EVENTS.UNINSTALL_VIRTUAL]: () => {},
  [NODE_EVENTS.PROPOSE_STATE]: () => {},
  [NODE_EVENTS.REJECT_STATE]: () => {},
  [NODE_EVENTS.WITHDRAW]: () => {}
};
