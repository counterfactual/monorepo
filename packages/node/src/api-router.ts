import { Node } from "@counterfactual/types";

import {
  appInstanceInstallController,
  appInstanceProposeInstallController,
  createMultisigController,
  getAllChannelAddressesController,
  getAppInstanceStateController,
  getInstalledAppInstancesController,
  getProposedAppInstancesController,
  virtualAppInstanceProposeInstallController
} from "./methods";

export const methodNameToImplementation = {
  [Node.MethodName.CREATE_MULTISIG]: createMultisigController,
  [Node.MethodName.GET_APP_INSTANCES]: getInstalledAppInstancesController,
  [Node.MethodName.GET_CHANNEL_ADDRESSES]: getAllChannelAddressesController,
  [Node.MethodName
    .GET_PROPOSED_APP_INSTANCES]: getProposedAppInstancesController,
  [Node.MethodName.GET_STATE]: getAppInstanceStateController,
  [Node.MethodName.INSTALL]: appInstanceInstallController,
  [Node.MethodName
    .PROPOSE_INSTALL_VIRTUAL]: virtualAppInstanceProposeInstallController,
  [Node.MethodName.PROPOSE_INSTALL]: appInstanceProposeInstallController
};
