import { Node } from "@counterfactual/types";

import {
  addMultisigController,
  installEventController,
  proposeInstallEventController,
  proposeInstallVirtualEventController
} from "./events";
import {
  createMultisigController,
  getAllChannelAddressesController,
  getAppInstanceStateController,
  getInstalledAppInstancesController,
  getProposedAppInstancesController,
  installAppInstanceController,
  proposeInstallAppInstanceController,
  proposeInstallVirtualAppInstanceController
} from "./methods";
import { NODE_EVENTS } from "./types";

export const methodNameToImplementation = {
  [Node.MethodName.CREATE_MULTISIG]: createMultisigController,
  [Node.MethodName.GET_APP_INSTANCES]: getInstalledAppInstancesController,
  [Node.MethodName.GET_CHANNEL_ADDRESSES]: getAllChannelAddressesController,
  [Node.MethodName
    .GET_PROPOSED_APP_INSTANCES]: getProposedAppInstancesController,
  [Node.MethodName.GET_STATE]: getAppInstanceStateController,
  [Node.MethodName.INSTALL]: installAppInstanceController,
  [Node.MethodName
    .PROPOSE_INSTALL_VIRTUAL]: proposeInstallVirtualAppInstanceController,
  [Node.MethodName.PROPOSE_INSTALL]: proposeInstallAppInstanceController
};

export const eventNameToImplementation = {
  [NODE_EVENTS.CREATE_MULTISIG]: addMultisigController,
  [NODE_EVENTS.INSTALL]: installEventController,
  [NODE_EVENTS.PROPOSE_INSTALL]: proposeInstallEventController,
  [NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL]: proposeInstallVirtualEventController,
  // TODO: implement the rest
  [NODE_EVENTS.PROPOSE_STATE]: () => {},
  [NODE_EVENTS.REJECT_INSTALL]: () => {},
  [NODE_EVENTS.REJECT_STATE]: () => {},
  [NODE_EVENTS.UNINSTALL]: () => {},
  [NODE_EVENTS.UPDATE_STATE]: () => {}
};
