import {
  addChannelController,
  depositEventController,
  installEventController,
  installVirtualEventController,
  proposeInstallEventController,
  proposeInstallVirtualEventController,
  protocolMessageEventController,
  rejectInstallEventController,
  rejectInstallVirtualEventController
} from "./events";
import {
  CreateChannelController,
  DepositController,
  GetAllChannelAddressesController,
  GetAppInstanceController,
  GetAppInstanceStateController,
  GetFreeBalanceStateController,
  GetInstalledAppInstancesController,
  GetMyFreeBalanceForStateController,
  GetProposedAppInstancesController,
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
import { NODE_EVENTS } from "./types";

// Maps controllers to JSONAPI operations.
export const controllersToOperations = {
  // Channel operations
  CreateChannelController: { type: "channel", op: "add" },
  GetAllChannelAddressesController: { type: "channel", op: "get" },
  DepositController: { type: "channel", op: "deposit" },
  WithdrawController: { type: "channel", op: "withdraw" },
  // TODO: Revisit this.
  GetFreeBalanceStateController: { type: "channel", op: "getFreeBalanceState" },
  GetMyFreeBalanceForStateController: {
    type: "channel",
    op: "getMyFreeBalanceForState"
  },

  // Proposal operations
  ProposeInstallAppInstanceController: { type: "proposal", op: "install" },
  ProposeInstallVirtualAppInstanceController: {
    type: "proposal",
    op: "installVirtual"
  },
  GetProposedAppInstancesController: { type: "proposal", op: "get" },
  RejectInstallController: { type: "proposal", op: "reject" },

  // App operations
  InstallAppInstanceController: { type: "app", op: "install" },
  InstallVirtualAppInstanceController: { type: "app", op: "installVirtual" },
  UninstallController: { type: "app", op: "uninstall" },
  UninstallVirtualController: { type: "app", op: "uninstallVirtual" },
  TakeActionController: { type: "app", op: "takeAction" },
  UpdateStateController: { type: "app", op: "updateState" },
  GetAppInstanceController: { type: "app", op: "get", params: ["id"] },
  GetAppInstanceStateController: { type: "app", op: "getState" },
  GetInstalledAppInstancesController: { type: "app", op: "get" }
};

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
  GetMyFreeBalanceForStateController,
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
    acc[controller.name] = handler.executeMethod.bind(handler);

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
  [NODE_EVENTS.PROTOCOL_MESSAGE_EVENT]: protocolMessageEventController,
  [NODE_EVENTS.REJECT_INSTALL]: rejectInstallEventController,
  [NODE_EVENTS.REJECT_INSTALL_VIRTUAL]: rejectInstallVirtualEventController,
  // TODO: Remove no-ops of obsolete functions
  [NODE_EVENTS.UPDATE_STATE]: () => {},
  [NODE_EVENTS.UNINSTALL]: () => {},
  [NODE_EVENTS.UNINSTALL_VIRTUAL]: () => {},
  [NODE_EVENTS.PROPOSE_STATE]: () => {},
  [NODE_EVENTS.REJECT_STATE]: () => {},
  [NODE_EVENTS.WITHDRAWAL_CONFIRMED]: () => {}
};
